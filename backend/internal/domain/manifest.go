package domain

import (
	"context"
	"time"

	"github.com/google/uuid"
)

// Manifest represents a grouping of Delivery Orders assigned to a Driver.
type Manifest struct {
	ID             uuid.UUID       `json:"id"`
	ManifestNumber string          `json:"manifest_number"`
	DriverID       *uuid.UUID      `json:"driver_id"`
	Driver         *Driver         `json:"driver,omitempty"`
	Status         string          `json:"status"`
	DispatchDate   *time.Time      `json:"dispatch_date"`
	CompletedDate  *time.Time      `json:"completed_date"`
	Notes          string          `json:"notes"`
	CreatedBy      *uuid.UUID      `json:"created_by"`
	Items          []*ManifestItem `json:"items,omitempty"`
	CreatedAt      time.Time       `json:"created_at"`
	UpdatedAt      time.Time       `json:"updated_at"`
}

// ManifestItem represents a single DO within a Manifest.
type ManifestItem struct {
	ID              uuid.UUID      `json:"id"`
	ManifestID      uuid.UUID      `json:"manifest_id"`
	DeliveryOrderID uuid.UUID      `json:"delivery_order_id"`
	DeliveryOrder   *DeliveryOrder `json:"delivery_order,omitempty"`
	SequenceNumber  int            `json:"sequence_number"`
	CreatedAt       time.Time      `json:"created_at"`
}

// ---- Request DTOs ----

// CreateManifestRequest represents the payload for creating a manifest.
type CreateManifestRequest struct {
	DriverID        uuid.UUID   `json:"driver_id" binding:"required"`
	DeliveryOrderIDs []uuid.UUID `json:"delivery_order_ids" binding:"required,min=1"`
	Notes           string      `json:"notes"`
}

// UpdateManifestStatusRequest represents the payload for updating manifest status.
type UpdateManifestStatusRequest struct {
	Status string `json:"status" binding:"required,oneof=draft dispatched in_transit completed cancelled"`
}

// ---- Repository Interface ----

// ManifestRepository defines the contract for manifest data access.
type ManifestRepository interface {
	Create(ctx context.Context, manifest *Manifest) error
	AddItems(ctx context.Context, manifestID uuid.UUID, doIDs []uuid.UUID) error
	FindByID(ctx context.Context, id uuid.UUID) (*Manifest, error)
	FindAll(ctx context.Context, pagination *PaginationRequest) ([]*Manifest, int64, error)
	FindItemsByManifestID(ctx context.Context, manifestID uuid.UUID) ([]*ManifestItem, error)
	UpdateStatus(ctx context.Context, id uuid.UUID, status string) error
}

// ---- Usecase Interface ----

// ManifestUsecase defines the contract for manifest business logic.
type ManifestUsecase interface {
	Create(ctx context.Context, req *CreateManifestRequest, createdBy uuid.UUID) (*Manifest, error)
	GetByID(ctx context.Context, id uuid.UUID) (*Manifest, error)
	GetAll(ctx context.Context, pagination *PaginationRequest) ([]*Manifest, int64, error)
	UpdateStatus(ctx context.Context, id uuid.UUID, req *UpdateManifestStatusRequest) (*Manifest, error)
}
