package domain

import (
	"context"
	"time"

	"github.com/google/uuid"
)

// DriverLocation represents the GPS coordinates of a driver at a specific timestamp.
type DriverLocation struct {
	ID         uuid.UUID `json:"id"`
	DriverID   uuid.UUID `json:"driver_id"`
	Latitude   float64   `json:"latitude"`
	Longitude  float64   `json:"longitude"`
	RecordedAt time.Time `json:"recorded_at"`
}

// SaveDriverLocationRequest represents the payload from GPS device/app.
type SaveDriverLocationRequest struct {
	Latitude  float64 `json:"latitude" binding:"required,latitude"`
	Longitude float64 `json:"longitude" binding:"required,longitude"`
}

// DriverLocationRepository defines data storage contracts for tracking locations.
type DriverLocationRepository interface {
	Save(ctx context.Context, loc *DriverLocation) error
	GetLatestByDriverID(ctx context.Context, driverID uuid.UUID) (*DriverLocation, error)
	GetHistoryByDriverID(ctx context.Context, driverID uuid.UUID, limit int) ([]*DriverLocation, error)
}

// DriverLocationUsecase defines business logic contracts for driver GPS tracking.
type DriverLocationUsecase interface {
	Track(ctx context.Context, driverUserID uuid.UUID, req *SaveDriverLocationRequest) (*DriverLocation, error)
	GetLatest(ctx context.Context, driverID uuid.UUID) (*DriverLocation, error)
	GetHistory(ctx context.Context, driverID uuid.UUID, limit int) ([]*DriverLocation, error)
}
