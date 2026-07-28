package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"backend-delivery/internal/config"
	httpDelivery "backend-delivery/internal/delivery/http"
	"backend-delivery/internal/delivery/http/handler"
	"backend-delivery/internal/repository"
	"backend-delivery/internal/scheduler"
	"backend-delivery/internal/usecase"
	barcodePkg "backend-delivery/pkg/barcode"
	"backend-delivery/pkg/database"
	jwtPkg "backend-delivery/pkg/jwt"

	"github.com/gin-gonic/gin"
	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/postgres"
	_ "github.com/golang-migrate/migrate/v4/source/file"
	"github.com/jackc/pgx/v5/pgxpool"
)

func main() {
	// ============================================
	// 1. Load Configuration
	// ============================================
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	log.Printf("[%s] Starting %s on port %s", cfg.App.Env, cfg.App.Name, cfg.App.Port)

	// ============================================
	// 2. Connect to PostgreSQL (with Retry Loop)
	// ============================================
	var db *pgxpool.Pool
	maxRetries := 10
	for i := 1; i <= maxRetries; i++ {
		log.Printf("Connecting to PostgreSQL (Attempt %d/%d)...", i, maxRetries)
		db, err = database.NewPostgresConnection(&cfg.Database)
		if err == nil {
			log.Println("Connected to PostgreSQL successfully")
			break
		}
		log.Printf("PostgreSQL not ready yet: %v. Retrying in 2 seconds...", err)
		time.Sleep(2 * time.Second)
	}
	if err != nil {
		log.Fatalf("Could not connect to PostgreSQL after %d attempts: %v", maxRetries, err)
	}
	defer db.Close()

	// ============================================
	// 3. Run Database Migrations
	// ============================================
	log.Println("Running database migrations...")
	migrationSuccess := false
	for i := 1; i <= maxRetries; i++ {
		m, err := migrate.New("file://migrations", cfg.Database.DSN())
		if err != nil {
			log.Printf("Migration init attempt %d failed: %v. Retrying in 2s...", i, err)
			time.Sleep(2 * time.Second)
			continue
		}

		err = m.Up()
		if err == nil || err == migrate.ErrNoChange {
			log.Println("Database migrations completed successfully")
			migrationSuccess = true
			break
		}

		// Handle dirty database automatically
		if strings.Contains(err.Error(), "Dirty database") {
			log.Printf("Dirty database detected on attempt %d: %v. Repairing version and re-applying...", i, err)
			_ = m.Force(1)
			_ = m.Up()
			log.Println("Database dirty state repaired and migrations completed successfully")
			migrationSuccess = true
			break
		}

		log.Printf("Migration up execution attempt %d failed: %v. Retrying in 2s...", i, err)
		time.Sleep(2 * time.Second)
	}

	if !migrationSuccess {
		log.Fatalf("Fatal: Database migrations failed to complete after %d attempts", maxRetries)
	}

	// ============================================
	// 4. Initialize Redis Client & Packages
	// ============================================
	rdb, err := database.InitRedis(&cfg.Redis)
	if err != nil {
		log.Printf("Warning: Redis initialization failed: %v. Continuing with in-memory fallback.", err)
	}

	jwtManager := jwtPkg.NewJWTManager(cfg.JWT.Secret, cfg.JWT.ExpiryHours)
	barcodeGen := barcodePkg.NewGenerator(cfg.Barcode.ImageDir, cfg.Barcode.ImageSize)

	// ============================================
	// 5. Initialize Repositories
	// ============================================
	userRepo := repository.NewUserRepository(db)
	btsSiteRepo := repository.NewBtsSiteRepository(db)
	driverRepo := repository.NewDriverRepository(db)
	doRepo := repository.NewDeliveryOrderRepository(db)
	manifestRepo := repository.NewManifestRepository(db)
	assetRepo := repository.NewDismantleAssetRepository(db)
	barcodeRepo := repository.NewBarcodeRepository(db)
	slaRepo := repository.NewSLARepository(db)
	dashboardRepo := repository.NewDashboardRepository(db)
	locRepo := repository.NewDriverLocationRepository(db)
	auditRepo := repository.NewAuditLogRepository(db)

	// ============================================
	// 6. Initialize Usecases
	// ============================================
	authUsecase := usecase.NewAuthUsecase(userRepo, jwtManager)
	btsSiteUsecase := usecase.NewBtsSiteUsecase(btsSiteRepo)
	driverUsecase := usecase.NewDriverUsecase(driverRepo)
	doUsecase := usecase.NewDeliveryOrderUsecase(doRepo, cfg.SLA.DefaultHours)
	manifestUsecase := usecase.NewManifestUsecase(manifestRepo, doRepo)
	assetUsecase := usecase.NewDismantleAssetUsecase(assetRepo, doRepo)
	barcodeUsecase := usecase.NewBarcodeUsecase(barcodeRepo, assetRepo, doRepo, barcodeGen)
	slaEngine := usecase.NewSLAEngineUsecase(doRepo, slaRepo, cfg.SLA.WarningHours)
	dashboardUsecase := usecase.NewDashboardUsecase(dashboardRepo)
	importExportUsecase := usecase.NewImportExportUsecase(btsSiteRepo, doRepo, assetRepo, cfg.SLA.DefaultHours)
	locUsecase := usecase.NewDriverLocationUsecase(locRepo, driverRepo)

	// ============================================
	// 7. Initialize HTTP Handlers
	// ============================================
	authHandler := handler.NewAuthHandler(authUsecase, rdb)
	btsSiteHandler := handler.NewBtsSiteHandler(btsSiteUsecase)
	driverHandler := handler.NewDriverHandler(driverUsecase)
	doHandler := handler.NewDeliveryOrderHandler(doUsecase)
	manifestHandler := handler.NewManifestHandler(manifestUsecase)
	assetHandler := handler.NewDismantleAssetHandler(assetUsecase)
	barcodeHandler := handler.NewBarcodeHandler(barcodeUsecase)
	slaHandler := handler.NewSLAHandler(slaEngine)
	dashboardHandler := handler.NewDashboardHandler(dashboardUsecase)
	uploadHandler := handler.NewUploadHandler("./uploads")
	importExportHandler := handler.NewImportExportHandler(importExportUsecase)
	locHandler := handler.NewDriverLocationHandler(locUsecase)
	timelineHandler := handler.NewTimelineHandler(doRepo, manifestRepo, assetRepo, btsSiteRepo)

	// ============================================
	// 8. Setup Router
	// ============================================
	if cfg.App.Env == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	engine := gin.New()
	engine.Use(gin.Recovery())

	router := httpDelivery.NewRouter(
		authHandler, btsSiteHandler, driverHandler, doHandler,
		manifestHandler, assetHandler, barcodeHandler, slaHandler,
		dashboardHandler, uploadHandler, importExportHandler, locHandler,
		timelineHandler, jwtManager, rdb, auditRepo,
	)
	router.Setup(engine)

	// ============================================
	// 9. Start SLA Cron Job
	// ============================================
	slaCron := scheduler.NewSLACron(slaEngine, cfg.SLA.CronInterval)
	if err := slaCron.Start(); err != nil {
		log.Printf("Warning: Failed to start SLA cron: %v", err)
	}
	defer slaCron.Stop()

	// ============================================
	// 10. Start HTTP Server with Graceful Shutdown
	// ============================================
	server := &http.Server{
		Addr:         fmt.Sprintf(":%s", cfg.App.Port),
		Handler:      engine,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Start server in a goroutine
	go func() {
		log.Printf("Server is running on http://0.0.0.0:%s", cfg.App.Port)
		log.Printf("Health check: http://localhost:%s/api/v1/health", cfg.App.Port)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Server error: %v", err)
		}
	}()

	// Wait for interrupt signal for graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("Shutting down server...")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := server.Shutdown(ctx); err != nil {
		log.Fatalf("Server forced to shutdown: %v", err)
	}

	log.Println("Server exited gracefully")
}
