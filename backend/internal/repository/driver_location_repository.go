package repository

import (
	"context"

	"backend-delivery/internal/domain"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type driverLocationRepository struct {
	db *pgxpool.Pool
}

// NewDriverLocationRepository creates a new DriverLocationRepository implementation.
func NewDriverLocationRepository(db *pgxpool.Pool) domain.DriverLocationRepository {
	return &driverLocationRepository{db: db}
}

func (r *driverLocationRepository) Save(ctx context.Context, loc *domain.DriverLocation) error {
	query := `
		INSERT INTO driver_locations (id, driver_id, latitude, longitude)
		VALUES ($1, $2, $3, $4)
		RETURNING recorded_at`

	if loc.ID == uuid.Nil {
		loc.ID = uuid.New()
	}

	return r.db.QueryRow(ctx, query, loc.ID, loc.DriverID, loc.Latitude, loc.Longitude).Scan(&loc.RecordedAt)
}

func (r *driverLocationRepository) GetLatestByDriverID(ctx context.Context, driverID uuid.UUID) (*domain.DriverLocation, error) {
	query := `
		SELECT id, driver_id, latitude, longitude, recorded_at
		FROM driver_locations
		WHERE driver_id = $1
		ORDER BY recorded_at DESC
		LIMIT 1`

	loc := &domain.DriverLocation{}
	err := r.db.QueryRow(ctx, query, driverID).Scan(
		&loc.ID, &loc.DriverID, &loc.Latitude, &loc.Longitude, &loc.RecordedAt,
	)
	if err != nil {
		return nil, err
	}
	return loc, nil
}

func (r *driverLocationRepository) GetHistoryByDriverID(ctx context.Context, driverID uuid.UUID, limit int) ([]*domain.DriverLocation, error) {
	if limit <= 0 {
		limit = 100 // Default limit
	}

	query := `
		SELECT id, driver_id, latitude, longitude, recorded_at
		FROM driver_locations
		WHERE driver_id = $1
		ORDER BY recorded_at DESC
		LIMIT $2`

	rows, err := r.db.Query(ctx, query, driverID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []*domain.DriverLocation
	for rows.Next() {
		loc := &domain.DriverLocation{}
		err := rows.Scan(&loc.ID, &loc.DriverID, &loc.Latitude, &loc.Longitude, &loc.RecordedAt)
		if err != nil {
			return nil, err
		}
		list = append(list, loc)
	}

	return list, nil
}
