package domain

import (
	"context"
	"time"

	"github.com/google/uuid"
)

// BtsSite represents a BTS tower location (4.600 titik di Kalimantan).
type BtsSite struct {
	ID        uuid.UUID `json:"id"`
	SiteID    string    `json:"site_id"`
	SiteName  string    `json:"site_name"`
	Address   string    `json:"address"`
	Province  string    `json:"province"`
	City      string    `json:"city"`
	District  string    `json:"district"`
	Latitude  *float64  `json:"latitude"`
	Longitude *float64  `json:"longitude"`
	IsActive  bool      `json:"is_active"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// ---- Request DTOs ----

// CreateBtsSiteRequest represents the payload for creating a BTS site.
type CreateBtsSiteRequest struct {
	SiteID    string   `json:"site_id" binding:"required"`
	SiteName  string   `json:"site_name" binding:"required"`
	Address   string   `json:"address"`
	Province  string   `json:"province"`
	City      string   `json:"city"`
	District  string   `json:"district"`
	Latitude  *float64 `json:"latitude"`
	Longitude *float64 `json:"longitude"`
}

// UpdateBtsSiteRequest represents the payload for updating a BTS site.
type UpdateBtsSiteRequest struct {
	SiteName  string   `json:"site_name"`
	Address   string   `json:"address"`
	Province  string   `json:"province"`
	City      string   `json:"city"`
	District  string   `json:"district"`
	Latitude  *float64 `json:"latitude"`
	Longitude *float64 `json:"longitude"`
	IsActive  *bool    `json:"is_active"`
}

// ---- Repository Interface ----

// BtsSiteRepository defines the contract for BTS site data access.
type BtsSiteRepository interface {
	Create(ctx context.Context, site *BtsSite) error
	FindByID(ctx context.Context, id uuid.UUID) (*BtsSite, error)
	FindBySiteID(ctx context.Context, siteID string) (*BtsSite, error)
	FindAll(ctx context.Context, pagination *PaginationRequest) ([]*BtsSite, int64, error)
	Update(ctx context.Context, site *BtsSite) error
	Delete(ctx context.Context, id uuid.UUID) error
}

// ---- Usecase Interface ----

// BtsSiteUsecase defines the contract for BTS site business logic.
type BtsSiteUsecase interface {
	Create(ctx context.Context, req *CreateBtsSiteRequest) (*BtsSite, error)
	GetByID(ctx context.Context, id uuid.UUID) (*BtsSite, error)
	GetAll(ctx context.Context, pagination *PaginationRequest) ([]*BtsSite, int64, error)
	Update(ctx context.Context, id uuid.UUID, req *UpdateBtsSiteRequest) (*BtsSite, error)
	Delete(ctx context.Context, id uuid.UUID) error
}
