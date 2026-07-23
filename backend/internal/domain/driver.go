package domain

import (
	"context"
	"time"

	"github.com/google/uuid"
)

// Driver represents a delivery driver / courier.
type Driver struct {
	ID           uuid.UUID `json:"id"`
	UserID       *uuid.UUID `json:"user_id"`
	FullName     string    `json:"full_name"`
	Phone        string    `json:"phone"`
	VehiclePlate string    `json:"vehicle_plate"`
	VehicleType  string    `json:"vehicle_type"`
	IsAvailable  bool      `json:"is_available"`
	IsActive     bool      `json:"is_active"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

// ---- Request DTOs ----

// CreateDriverRequest represents the payload for creating a driver.
type CreateDriverRequest struct {
	UserID       *uuid.UUID `json:"user_id"`
	FullName     string     `json:"full_name" binding:"required"`
	Phone        string     `json:"phone" binding:"required"`
	VehiclePlate string     `json:"vehicle_plate"`
	VehicleType  string     `json:"vehicle_type"`
}

// UpdateDriverRequest represents the payload for updating a driver.
type UpdateDriverRequest struct {
	FullName     string `json:"full_name"`
	Phone        string `json:"phone"`
	VehiclePlate string `json:"vehicle_plate"`
	VehicleType  string `json:"vehicle_type"`
	IsAvailable  *bool  `json:"is_available"`
	IsActive     *bool  `json:"is_active"`
}

// ---- Repository Interface ----

// DriverRepository defines the contract for driver data access.
type DriverRepository interface {
	Create(ctx context.Context, driver *Driver) error
	FindByID(ctx context.Context, id uuid.UUID) (*Driver, error)
	FindByUserID(ctx context.Context, userID uuid.UUID) (*Driver, error)
	FindAll(ctx context.Context, pagination *PaginationRequest) ([]*Driver, int64, error)
	FindAvailable(ctx context.Context) ([]*Driver, error)
	Update(ctx context.Context, driver *Driver) error
	Delete(ctx context.Context, id uuid.UUID) error
}

// ---- Usecase Interface ----

// DriverUsecase defines the contract for driver business logic.
type DriverUsecase interface {
	Create(ctx context.Context, req *CreateDriverRequest) (*Driver, error)
	GetByID(ctx context.Context, id uuid.UUID) (*Driver, error)
	GetAll(ctx context.Context, pagination *PaginationRequest) ([]*Driver, int64, error)
	Update(ctx context.Context, id uuid.UUID, req *UpdateDriverRequest) (*Driver, error)
	Delete(ctx context.Context, id uuid.UUID) error
}
