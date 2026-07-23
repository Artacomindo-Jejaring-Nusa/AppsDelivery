package domain

import (
	"context"
	"time"

	"github.com/google/uuid"
)

// DeliveryOrder represents a Delivery Order (DO) from PT. Eriksin.
type DeliveryOrder struct {
	ID                 uuid.UUID  `json:"id"`
	DONumber           string     `json:"do_number"`
	BtsSiteID          *uuid.UUID `json:"bts_site_id"`
	BtsSite            *BtsSite   `json:"bts_site,omitempty"`
	Description        string     `json:"description"`
	Status             string     `json:"status"`
	SLAHours           int        `json:"sla_hours"`
	SLADeadline        *time.Time `json:"sla_deadline"`
	SLAStatus          string     `json:"sla_status"`
	OriginAddress      string     `json:"origin_address"`
	DestinationAddress string     `json:"destination_address"`
	Notes              string     `json:"notes"`
	CreatedBy          *uuid.UUID `json:"created_by"`
	CreatedAt          time.Time  `json:"created_at"`
	UpdatedAt          time.Time  `json:"updated_at"`
	DeletedAt          *time.Time `json:"deleted_at,omitempty"`
}

// ---- Request DTOs ----

// CreateDeliveryOrderRequest represents the payload for creating a DO.
type CreateDeliveryOrderRequest struct {
	DONumber           string     `json:"do_number" binding:"required"`
	BtsSiteID          *uuid.UUID `json:"bts_site_id"`
	Description        string     `json:"description"`
	SLAHours           int        `json:"sla_hours"`
	OriginAddress      string     `json:"origin_address"`
	DestinationAddress string     `json:"destination_address"`
	Notes              string     `json:"notes"`
}

// UpdateDOStatusRequest represents the payload for updating a DO status.
type UpdateDOStatusRequest struct {
	Status string `json:"status" binding:"required,oneof=pending assigned in_transit delivered returned completed cancelled"`
	Notes  string `json:"notes"`
}

// DOFilterRequest holds filter parameters for listing DOs.
type DOFilterRequest struct {
	PaginationRequest
	Status    string `form:"status"`
	SLAStatus string `form:"sla_status"`
	BtsSiteID string `form:"bts_site_id"`
}

// ---- Repository Interface ----

// DeliveryOrderRepository defines the contract for DO data access.
type DeliveryOrderRepository interface {
	Create(ctx context.Context, do *DeliveryOrder) error
	FindByID(ctx context.Context, id uuid.UUID) (*DeliveryOrder, error)
	FindByDONumber(ctx context.Context, doNumber string) (*DeliveryOrder, error)
	FindAll(ctx context.Context, filter *DOFilterRequest) ([]*DeliveryOrder, int64, error)
	UpdateStatus(ctx context.Context, id uuid.UUID, status, notes string) error
	UpdateSLAStatus(ctx context.Context, id uuid.UUID, slaStatus string) error
	FindPendingForSLA(ctx context.Context) ([]*DeliveryOrder, error)
	SoftDelete(ctx context.Context, id uuid.UUID) error
}

// ---- Usecase Interface ----

// DeliveryOrderUsecase defines the contract for DO business logic.
type DeliveryOrderUsecase interface {
	Create(ctx context.Context, req *CreateDeliveryOrderRequest, createdBy uuid.UUID) (*DeliveryOrder, error)
	GetByID(ctx context.Context, id uuid.UUID) (*DeliveryOrder, error)
	GetAll(ctx context.Context, filter *DOFilterRequest) ([]*DeliveryOrder, int64, error)
	UpdateStatus(ctx context.Context, id uuid.UUID, req *UpdateDOStatusRequest) (*DeliveryOrder, error)
}
