package http

import (
	"net/http"
	"time"

	"backend-delivery/internal/delivery/http/handler"
	"backend-delivery/internal/delivery/http/middleware"
	"backend-delivery/internal/domain"
	jwtPkg "backend-delivery/pkg/jwt"
	"backend-delivery/pkg/response"
	wsPkg "backend-delivery/pkg/ws"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
)

// Router holds all HTTP handlers and configures routes.
type Router struct {
	authHandler         *handler.AuthHandler
	btsSiteHandler      *handler.BtsSiteHandler
	driverHandler       *handler.DriverHandler
	doHandler           *handler.DeliveryOrderHandler
	manifestHandler     *handler.ManifestHandler
	assetHandler        *handler.DismantleAssetHandler
	barcodeHandler      *handler.BarcodeHandler
	slaHandler          *handler.SLAHandler
	dashboardHandler    *handler.DashboardHandler
	uploadHandler       *handler.UploadHandler
	importExportHandler *handler.ImportExportHandler
	locHandler          *handler.DriverLocationHandler
	timelineHandler     *handler.TimelineHandler
	trackingHandler     *handler.TrackingHandler
	jwtManager          *jwtPkg.JWTManager
	rdb                 *redis.Client
	auditRepo           domain.AuditLogRepository
}

// NewRouter creates a new Router with all handlers.
func NewRouter(
	authHandler *handler.AuthHandler,
	btsSiteHandler *handler.BtsSiteHandler,
	driverHandler *handler.DriverHandler,
	doHandler *handler.DeliveryOrderHandler,
	manifestHandler *handler.ManifestHandler,
	assetHandler *handler.DismantleAssetHandler,
	barcodeHandler *handler.BarcodeHandler,
	slaHandler *handler.SLAHandler,
	dashboardHandler *handler.DashboardHandler,
	uploadHandler *handler.UploadHandler,
	importExportHandler *handler.ImportExportHandler,
	locHandler *handler.DriverLocationHandler,
	timelineHandler *handler.TimelineHandler,
	trackingHandler *handler.TrackingHandler,
	jwtManager *jwtPkg.JWTManager,
	rdb *redis.Client,
	auditRepo domain.AuditLogRepository,
) *Router {
	return &Router{
		authHandler:         authHandler,
		btsSiteHandler:      btsSiteHandler,
		driverHandler:       driverHandler,
		doHandler:           doHandler,
		manifestHandler:     manifestHandler,
		assetHandler:        assetHandler,
		barcodeHandler:      barcodeHandler,
		slaHandler:          slaHandler,
		dashboardHandler:    dashboardHandler,
		uploadHandler:       uploadHandler,
		importExportHandler: importExportHandler,
		locHandler:          locHandler,
		timelineHandler:     timelineHandler,
		trackingHandler:     trackingHandler,
		jwtManager:          jwtManager,
		rdb:                 rdb,
		auditRepo:           auditRepo,
	}
}

// Setup configures all routes on the Gin engine.
func (r *Router) Setup(engine *gin.Engine) {
	// Global middleware
	engine.Use(middleware.CORSMiddleware())
	engine.Use(middleware.SecurityHeaders())
	engine.Use(middleware.LoggerMiddleware())
	engine.Use(middleware.RequestIDMiddleware())
	if r.auditRepo != nil {
		engine.Use(middleware.AuditLogger(r.auditRepo))
	}

	// Health check (public)
	engine.GET("/api/v1/health", func(c *gin.Context) {
		response.Success(c, http.StatusOK, "Delivery API is running", gin.H{
			"status":  "healthy",
			"version": "1.1.0",
		})
	})

	// Serve barcode images and uploaded media as static files
	engine.Static("/uploads", "./uploads")

	// API v1 routes
	v1 := engine.Group("/api/v1")

	// ---- Auth (Public) ----
	auth := v1.Group("/auth")
	{
		auth.POST("/login", middleware.RateLimiter(r.rdb, 5, 1*time.Minute, "rate:login"), r.authHandler.Login)
	}

	// ---- Public Tracking Route (Unauthenticated) ----
	v1.GET("/track/:tracking_number", r.trackingHandler.PublicTrack)

	// ---- WebSocket Endpoint (Real-time Notifications) ----
	v1.GET("/ws", func(c *gin.Context) {
		wsPkg.HandleWS(c.Writer, c.Request)
	})

	// ---- Protected Routes ----
	protected := v1.Group("")
	protected.Use(middleware.AuthMiddleware(r.jwtManager, r.rdb))
	{
		// ---- Dashboard Analytics & Project Timeline ----
		protected.GET("/dashboard/stats", r.dashboardHandler.GetStats)
		protected.GET("/dashboard/analytics", r.dashboardHandler.GetAnalytics)
		protected.GET("/projects/timeline", r.timelineHandler.GetTimeline)


		// ---- Uploads ----
		protected.POST("/uploads", r.uploadHandler.UploadFile)

		// ---- Auth / Users ----
		protected.GET("/users/me", r.authHandler.GetProfile)
		protected.POST("/users/fcm-token", r.authHandler.SaveFCMToken)
		protected.POST("/auth/logout", r.authHandler.Logout)
		protected.POST("/auth/register", middleware.RoleMiddleware(domain.RoleAdmin), r.authHandler.Register)
		protected.GET("/users", middleware.RoleMiddleware(domain.RoleAdmin), r.authHandler.GetAllUsers)
		protected.PUT("/users/:id", middleware.RoleMiddleware(domain.RoleAdmin), r.authHandler.UpdateUser)

		// ---- BTS Sites ----
		btsSites := protected.Group("/bts-sites")
		{
			btsSites.POST("", middleware.RoleMiddleware(domain.RoleAdmin), r.btsSiteHandler.Create)
			btsSites.POST("/import", middleware.RoleMiddleware(domain.RoleAdmin), r.importExportHandler.ImportBtsSites)
			btsSites.GET("", r.btsSiteHandler.GetAll)
			btsSites.GET("/:id", r.btsSiteHandler.GetByID)
			btsSites.PUT("/:id", middleware.RoleMiddleware(domain.RoleAdmin), r.btsSiteHandler.Update)
			btsSites.DELETE("/:id", middleware.RoleMiddleware(domain.RoleAdmin), r.btsSiteHandler.Delete)
		}

		// ---- Drivers ----
		drivers := protected.Group("/drivers")
		{
			drivers.POST("", middleware.RoleMiddleware(domain.RoleAdmin), r.driverHandler.Create)
			drivers.GET("", middleware.RoleMiddleware(domain.RoleAdmin, domain.RoleDispatcher), r.driverHandler.GetAll)
			drivers.POST("/location", middleware.RoleMiddleware(domain.RoleDriver), r.locHandler.Track)
			drivers.GET("/:id", middleware.RoleMiddleware(domain.RoleAdmin, domain.RoleDispatcher), r.driverHandler.GetByID)
			drivers.PUT("/:id", middleware.RoleMiddleware(domain.RoleAdmin), r.driverHandler.Update)
			drivers.DELETE("/:id", middleware.RoleMiddleware(domain.RoleAdmin), r.driverHandler.Delete)
			drivers.GET("/:id/location", middleware.RoleMiddleware(domain.RoleAdmin, domain.RoleDispatcher), r.locHandler.GetLatest)
			drivers.GET("/:id/location/history", middleware.RoleMiddleware(domain.RoleAdmin, domain.RoleDispatcher), r.locHandler.GetHistory)
		}

		// ---- Delivery Orders ----
		deliveryOrders := protected.Group("/delivery-orders")
		{
			deliveryOrders.POST("", middleware.RoleMiddleware(domain.RoleAdmin, domain.RoleDispatcher), r.doHandler.Create)
			deliveryOrders.POST("/import", middleware.RoleMiddleware(domain.RoleAdmin, domain.RoleDispatcher), r.importExportHandler.ImportDeliveryOrders)
			deliveryOrders.GET("", r.doHandler.GetAll)
			deliveryOrders.GET("/:id", r.doHandler.GetByID)
			deliveryOrders.PUT("/:id/status", middleware.RoleMiddleware(domain.RoleAdmin, domain.RoleDispatcher, domain.RoleDriver), r.doHandler.UpdateStatus)

			// Dismantle Assets (nested under DO)
			deliveryOrders.POST("/:id/assets", middleware.RoleMiddleware(domain.RoleAdmin, domain.RoleDispatcher, domain.RoleDataEntry), r.assetHandler.Create)
			deliveryOrders.POST("/:id/assets/batch", middleware.RoleMiddleware(domain.RoleAdmin, domain.RoleDispatcher, domain.RoleDataEntry), r.assetHandler.CreateBatch)
			deliveryOrders.GET("/:id/assets", r.assetHandler.GetByDeliveryOrderID)
		}

		// ---- Reports Export ----
		reports := protected.Group("/reports")
		{
			reports.GET("/export/delivery-orders", middleware.RoleMiddleware(domain.RoleAdmin, domain.RoleDispatcher), r.importExportHandler.ExportDeliveryOrders)
			reports.GET("/export/dismantle-assets", middleware.RoleMiddleware(domain.RoleAdmin, domain.RoleDispatcher, domain.RoleDataEntry), r.importExportHandler.ExportDismantleAssets)
		}

		// ---- Manifests ----
		manifests := protected.Group("/manifests")
		{
			manifests.POST("", middleware.RoleMiddleware(domain.RoleAdmin, domain.RoleDispatcher), r.manifestHandler.Create)
			manifests.GET("", r.manifestHandler.GetAll)
			manifests.GET("/:id", r.manifestHandler.GetByID)
			manifests.PUT("/:id/status", middleware.RoleMiddleware(domain.RoleAdmin, domain.RoleDispatcher, domain.RoleDriver), r.manifestHandler.UpdateStatus)
		}

		// ---- Assets (standalone) ----
		assets := protected.Group("/assets")
		{
			assets.PUT("/:id", middleware.RoleMiddleware(domain.RoleAdmin, domain.RoleDataEntry), r.assetHandler.Update)
			assets.DELETE("/:id", middleware.RoleMiddleware(domain.RoleAdmin), r.assetHandler.Delete)
			assets.POST("/:id/barcode", middleware.RoleMiddleware(domain.RoleAdmin, domain.RoleDataEntry), r.barcodeHandler.Generate)
		}

		// ---- Barcodes ----
		barcodes := protected.Group("/barcodes")
		{
			barcodes.GET("/:code", r.barcodeHandler.Lookup)
			barcodes.POST("/:code/scan", r.barcodeHandler.Scan)
		}

		// ---- SLA Dashboard ----
		sla := protected.Group("/sla")
		{
			sla.GET("/summary", middleware.RoleMiddleware(domain.RoleAdmin, domain.RoleDispatcher), r.slaHandler.GetSummary)
			sla.GET("/logs", middleware.RoleMiddleware(domain.RoleAdmin), r.slaHandler.GetLogs)
		}
	}
}
