package domain

import (
	"context"
	"time"

	"github.com/google/uuid"
)

// DismantleAsset represents a dismantled item from a BTS site.
type DismantleAsset struct {
	ID              uuid.UUID  `json:"id"`
	DeliveryOrderID uuid.UUID  `json:"delivery_order_id"`
	Category        string     `json:"category"`
	ItemName        string     `json:"item_name"`
	SerialNumber    string     `json:"serial_number"`
	Quantity        int        `json:"quantity"`
	Unit            string     `json:"unit"`
	Condition       string     `json:"condition"`
	Notes           string     `json:"notes"`
	CreatedBy       *uuid.UUID `json:"created_by"`
	CreatedAt       time.Time  `json:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at"`
}

// ---- Request DTOs ----

// CreateDismantleAssetRequest represents the payload for creating a dismantle asset.
type CreateDismantleAssetRequest struct {
	Category     string `json:"category" binding:"required"`
	ItemName     string `json:"item_name" binding:"required"`
	SerialNumber string `json:"serial_number"`
	Quantity     int    `json:"quantity" binding:"required,min=1"`
	Unit         string `json:"unit" binding:"required"`
	Condition    string `json:"condition"`
	Notes        string `json:"notes"`
}

// BatchCreateDismantleAssetRequest supports bulk insert of multiple assets.
type BatchCreateDismantleAssetRequest struct {
	Assets []CreateDismantleAssetRequest `json:"assets" binding:"required,min=1,dive"`
}

// UpdateDismantleAssetRequest represents the payload for updating a dismantle asset.
type UpdateDismantleAssetRequest struct {
	Category     string `json:"category"`
	ItemName     string `json:"item_name"`
	SerialNumber string `json:"serial_number"`
	Quantity     *int   `json:"quantity"`
	Unit         string `json:"unit"`
	Condition    string `json:"condition"`
	Notes        string `json:"notes"`
}

// ---- Repository Interface ----

// DismantleAssetRepository defines the contract for dismantle asset data access.
type DismantleAssetRepository interface {
	Create(ctx context.Context, asset *DismantleAsset) error
	CreateBatch(ctx context.Context, assets []*DismantleAsset) error
	FindByID(ctx context.Context, id uuid.UUID) (*DismantleAsset, error)
	FindByDeliveryOrderID(ctx context.Context, doID uuid.UUID, pagination *PaginationRequest) ([]*DismantleAsset, int64, error)
	Update(ctx context.Context, asset *DismantleAsset) error
	Delete(ctx context.Context, id uuid.UUID) error
}

// ---- Usecase Interface ----

// DismantleAssetUsecase defines the contract for dismantle asset business logic.
type DismantleAssetUsecase interface {
	Create(ctx context.Context, doID uuid.UUID, req *CreateDismantleAssetRequest, createdBy uuid.UUID) (*DismantleAsset, error)
	CreateBatch(ctx context.Context, doID uuid.UUID, req *BatchCreateDismantleAssetRequest, createdBy uuid.UUID) ([]*DismantleAsset, error)
	GetByDeliveryOrderID(ctx context.Context, doID uuid.UUID, pagination *PaginationRequest) ([]*DismantleAsset, int64, error)
	Update(ctx context.Context, id uuid.UUID, req *UpdateDismantleAssetRequest) (*DismantleAsset, error)
	Delete(ctx context.Context, id uuid.UUID) error
}
