package usecase

import (
	"context"
	"errors"
	"fmt"
	"log"
	"time"

	"backend-delivery/internal/domain"
	"backend-delivery/pkg/fcm"
	"backend-delivery/pkg/ws"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/redis/go-redis/v9"
)

type manifestUsecase struct {
	manifestRepo domain.ManifestRepository
	doRepo       domain.DeliveryOrderRepository
	driverRepo   domain.DriverRepository
	rdb          *redis.Client
}

// NewManifestUsecase creates a new ManifestUsecase implementation.
func NewManifestUsecase(manifestRepo domain.ManifestRepository, doRepo domain.DeliveryOrderRepository, driverRepo domain.DriverRepository, rdb *redis.Client) domain.ManifestUsecase {
	return &manifestUsecase{
		manifestRepo: manifestRepo,
		doRepo:       doRepo,
		driverRepo:   driverRepo,
		rdb:          rdb,
	}
}

func (u *manifestUsecase) Create(ctx context.Context, req *domain.CreateManifestRequest, createdBy uuid.UUID) (*domain.Manifest, error) {
	// Validate driver and availability
	driver, err := u.driverRepo.FindByID(ctx, req.DriverID)
	if err != nil {
		return nil, fmt.Errorf("driver not found: %w", err)
	}
	if !driver.IsAvailable {
		return nil, errors.New("driver is already assigned to an active manifest and is not available")
	}

	// Validate that all DO IDs exist and are in "pending" status
	for _, doID := range req.DeliveryOrderIDs {
		do, err := u.doRepo.FindByID(ctx, doID)
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				return nil, fmt.Errorf("delivery order %s not found", doID.String())
			}
			return nil, err
		}
		if do.Status != domain.DOStatusPending {
			return nil, fmt.Errorf("delivery order %s is not in pending status (current: %s)", do.DONumber, do.Status)
		}
	}

	// Generate manifest number
	manifestNumber := fmt.Sprintf("MNF-%s", time.Now().Format("20060102-150405"))

	manifest := &domain.Manifest{
		ID:             uuid.New(),
		ManifestNumber: manifestNumber,
		DriverID:       &req.DriverID,
		Status:         domain.ManifestStatusDispatched,
		Notes:          req.Notes,
		CreatedBy:      &createdBy,
	}

	if err := u.manifestRepo.Create(ctx, manifest); err != nil {
		return nil, err
	}

	// Update driver availability status to false (assigned/busy)
	driver.IsAvailable = false
	if err := u.driverRepo.Update(ctx, driver); err != nil {
		return nil, fmt.Errorf("failed to update driver availability: %w", err)
	}

	// Add items to manifest
	if err := u.manifestRepo.AddItems(ctx, manifest.ID, req.DeliveryOrderIDs); err != nil {
		return nil, err
	}

	// Update each DO status to "in_transit"
	for _, doID := range req.DeliveryOrderIDs {
		if err := u.doRepo.UpdateStatus(ctx, doID, domain.DOStatusInTransit, "Dispatched in manifest "+manifest.ManifestNumber); err != nil {
			return nil, err
		}
	}

	// Broadcast WebSocket notification to Admin Dashboard
	go func(manifestNum string) {
		ws.GetHub().BroadcastNotification(
			"New Dispatch Assigned",
			fmt.Sprintf("Manifest %s has been created and assigned to Driver", manifestNum),
			"info",
			map[string]interface{}{
				"manifest_number": manifestNum,
				"action":          "view_delivery_orders",
			},
		)
	}(manifest.ManifestNumber)

	// Trigger FCM Push Notifications asynchronously to Driver HP
	// Sends: 1 summary notification + 1 notification per Delivery Order
	go func(manifestNum string, driverID uuid.UUID, doIDs []uuid.UUID) {
		if u.rdb == nil {
			log.Printf("[FCM] Redis not available, skipping push notification")
			return
		}

		bgCtx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer cancel()

		// 1. Resolve FCM token for the driver
		fcmToken := u.resolveFCMToken(bgCtx, driverID)
		if fcmToken == "" {
			log.Printf("[FCM] WARNING: Could not resolve any FCM token for manifest %s", manifestNum)
			return
		}

		// 2. Send summary notification first
		summaryTitle := "🚚 Penugasan Manifest Baru"
		summaryBody := fmt.Sprintf("Manifest %s — %d shipment telah ditugaskan kepada Anda.", manifestNum, len(doIDs))
		if err := fcm.SendPushNotification(bgCtx, fcmToken, summaryTitle, summaryBody); err != nil {
			log.Printf("[FCM] Failed to send summary notification: %v", err)
		} else {
			log.Printf("[FCM] ✅ Summary push notification sent for manifest %s", manifestNum)
		}

		// 3. Send individual notification per Delivery Order (with 500ms delay between each)
		for i, doID := range doIDs {
			time.Sleep(500 * time.Millisecond)

			doDetail, err := u.doRepo.FindByID(bgCtx, doID)
			if err != nil {
				log.Printf("[FCM] Could not fetch DO %s for notification: %v", doID, err)
				continue
			}

			var doTitle, doBody string
			siteName := doDetail.DestinationAddress
			if doDetail.BtsSite != nil {
				siteName = fmt.Sprintf("%s (%s)", doDetail.BtsSite.SiteName, doDetail.BtsSite.City)
			}

			if doDetail.Type == "outbound" {
				doTitle = fmt.Sprintf("📦 [%d/%d] OUTBOUND Dismantle", i+1, len(doIDs))
				doBody = fmt.Sprintf("%s — Ambil material dari %s", doDetail.DONumber, siteName)
			} else {
				doTitle = fmt.Sprintf("📦 [%d/%d] INBOUND Logistics", i+1, len(doIDs))
				doBody = fmt.Sprintf("%s — Kirim ke %s", doDetail.DONumber, siteName)
			}

			if err := fcm.SendPushNotification(bgCtx, fcmToken, doTitle, doBody); err != nil {
				log.Printf("[FCM] Failed to send DO notification #%d (%s): %v", i+1, doDetail.DONumber, err)
			} else {
				log.Printf("[FCM] ✅ DO notification #%d sent: %s → %s", i+1, doDetail.DONumber, siteName)
			}
		}

		log.Printf("[FCM] All %d push notifications dispatched for manifest %s", len(doIDs)+1, manifestNum)
	}(manifest.ManifestNumber, req.DriverID, req.DeliveryOrderIDs)

	// Load items for response
	items, _ := u.manifestRepo.FindItemsByManifestID(ctx, manifest.ID)
	manifest.Items = items

	return manifest, nil
}

func (u *manifestUsecase) GetByID(ctx context.Context, id uuid.UUID) (*domain.Manifest, error) {
	manifest, err := u.manifestRepo.FindByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errors.New("manifest not found")
		}
		return nil, err
	}

	// Load items
	items, err := u.manifestRepo.FindItemsByManifestID(ctx, id)
	if err != nil {
		return nil, err
	}
	manifest.Items = items

	return manifest, nil
}

func (u *manifestUsecase) GetAll(ctx context.Context, pagination *domain.PaginationRequest) ([]*domain.Manifest, int64, error) {
	manifests, total, err := u.manifestRepo.FindAll(ctx, pagination)
	if err != nil {
		return nil, 0, err
	}

	for _, m := range manifests {
		if m.DriverID != nil {
			if fullM, err := u.manifestRepo.FindByID(ctx, m.ID); err == nil && fullM.Driver != nil {
				m.Driver = fullM.Driver
			}
		}
		items, _ := u.manifestRepo.FindItemsByManifestID(ctx, m.ID)
		m.Items = items
	}

	return manifests, total, nil
}

func (u *manifestUsecase) UpdateStatus(ctx context.Context, id uuid.UUID, req *domain.UpdateManifestStatusRequest) (*domain.Manifest, error) {
	manifest, err := u.manifestRepo.FindByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errors.New("manifest not found")
		}
		return nil, err
	}

	if err := u.manifestRepo.UpdateStatus(ctx, id, req.Status); err != nil {
		return nil, err
	}

	// When manifest is dispatched, update all DOs to "in_transit"
	if req.Status == domain.ManifestStatusDispatched || req.Status == domain.ManifestStatusInTransit {
		items, _ := u.manifestRepo.FindItemsByManifestID(ctx, id)
		doStatus := domain.DOStatusInTransit
		for _, item := range items {
			_ = u.doRepo.UpdateStatus(ctx, item.DeliveryOrderID, doStatus, "Manifest dispatched")
		}
	}

	// When manifest is completed, set driver availability back to true (idle/ready)
	if req.Status == domain.ManifestStatusCompleted {
		if manifest.DriverID != nil {
			driver, err := u.driverRepo.FindByID(ctx, *manifest.DriverID)
			if err == nil && driver != nil {
				driver.IsAvailable = true
				_ = u.driverRepo.Update(ctx, driver)
			}
		}
	}

	manifest.Status = req.Status
	return manifest, nil
}

// resolveFCMToken attempts to find a valid FCM token for the given driver
// by trying multiple Redis keys: fcm:<driverID>, fcm:<userID>, fcm:latest, and broadcast
func (u *manifestUsecase) resolveFCMToken(ctx context.Context, driverID uuid.UUID) string {
	var tokenKeys []string
	tokenKeys = append(tokenKeys, "fcm:"+driverID.String())

	if u.driverRepo != nil {
		driver, err := u.driverRepo.FindByID(ctx, driverID)
		if err == nil && driver != nil && driver.UserID != nil {
			tokenKeys = append(tokenKeys, "fcm:"+driver.UserID.String())
			log.Printf("[FCM] Resolved driverID %s -> userID %s", driverID, driver.UserID.String())
		}
	}

	tokenKeys = append(tokenKeys, "fcm:latest")

	// Try each key until one has a valid token
	for _, key := range tokenKeys {
		token, err := u.rdb.Get(ctx, key).Result()
		if err == nil && token != "" {
			log.Printf("[FCM] Token resolved via key=%s", key)
			return token
		}
	}

	// Broadcast fallback: try all fcm:* keys
	keys, err := u.rdb.Keys(ctx, "fcm:*").Result()
	if err == nil && len(keys) > 0 {
		for _, k := range keys {
			t, e := u.rdb.Get(ctx, k).Result()
			if e == nil && t != "" {
				log.Printf("[FCM] Token resolved via broadcast key=%s", k)
				return t
			}
		}
	}

	return ""
}
