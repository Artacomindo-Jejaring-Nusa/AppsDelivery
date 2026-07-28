package usecase

import (
	"context"
	"errors"
	"fmt"
	"log"
	"time"

	"backend-delivery/internal/domain"
	"backend-delivery/pkg/fcm"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/redis/go-redis/v9"
)

type manifestUsecase struct {
	manifestRepo domain.ManifestRepository
	doRepo       domain.DeliveryOrderRepository
	rdb          *redis.Client
}

// NewManifestUsecase creates a new ManifestUsecase implementation.
func NewManifestUsecase(manifestRepo domain.ManifestRepository, doRepo domain.DeliveryOrderRepository, rdb *redis.Client) domain.ManifestUsecase {
	return &manifestUsecase{
		manifestRepo: manifestRepo,
		doRepo:       doRepo,
		rdb:          rdb,
	}
}

func (u *manifestUsecase) Create(ctx context.Context, req *domain.CreateManifestRequest, createdBy uuid.UUID) (*domain.Manifest, error) {
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

	// Trigger FCM Push Notification asynchronously to Driver HP
	go func(manifestNum string, driverID uuid.UUID) {
		title := "🚚 Penugasan Manifest Baru"
		body := fmt.Sprintf("Manifest %s telah ditugaskan kepada Anda. Cek sekarang!", manifestNum)

		if u.rdb != nil {
			bgCtx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
			defer cancel()

			// 1. Check driverID key
			token, err := u.rdb.Get(bgCtx, "fcm:"+driverID.String()).Result()
			if err == nil && token != "" {
				if err := fcm.SendPushNotification(bgCtx, token, title, body); err == nil {
					log.Printf("[FCM] Push notification sent successfully to driver %s", driverID)
					return
				}
			}

			// 2. Fallback: Broadcast to all registered FCM Tokens in Redis
			keys, err := u.rdb.Keys(bgCtx, "fcm:*").Result()
			if err == nil && len(keys) > 0 {
				for _, k := range keys {
					t, e := u.rdb.Get(bgCtx, k).Result()
					if e == nil && t != "" {
						if err := fcm.SendPushNotification(bgCtx, t, title, body); err == nil {
							log.Printf("[FCM] Fallback push notification sent successfully to token %s...", t[:10])
						}
					}
				}
			}
		}
	}(manifest.ManifestNumber, req.DriverID)

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

	manifest.Status = req.Status
	return manifest, nil
}
