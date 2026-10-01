package repository

import (
	"context"
	"fmt"

	"backend-delivery/internal/domain"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type driverRepository struct {
	db *pgxpool.Pool
}

// NewDriverRepository creates a new DriverRepository implementation.
func NewDriverRepository(db *pgxpool.Pool) domain.DriverRepository {
	return &driverRepository{db: db}
}

func (r *driverRepository) Create(ctx context.Context, driver *domain.Driver) error {
	query := `
		INSERT INTO drivers (id, user_id, full_name, phone, vehicle_plate, vehicle_type)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING created_at, updated_at`

	if driver.ID == uuid.Nil {
		driver.ID = uuid.New()
	}

	return r.db.QueryRow(ctx, query,
		driver.ID, driver.UserID, driver.FullName, driver.Phone,
		driver.VehiclePlate, driver.VehicleType,
	).Scan(&driver.CreatedAt, &driver.UpdatedAt)
}

func (r *driverRepository) FindByID(ctx context.Context, id uuid.UUID) (*domain.Driver, error) {
	query := `
		SELECT 
			d.id, d.user_id, d.full_name, d.phone, d.vehicle_plate, d.vehicle_type, d.is_available, d.is_active, d.created_at, d.updated_at,
			dl.latitude, dl.longitude, dl.recorded_at
		FROM drivers d
		LEFT JOIN LATERAL (
			SELECT latitude, longitude, recorded_at
			FROM driver_locations 
			WHERE driver_id = d.id 
			ORDER BY recorded_at DESC 
			LIMIT 1
		) dl ON true
		WHERE d.id = $1 AND d.is_active = true`

	driver := &domain.Driver{}
	err := r.db.QueryRow(ctx, query, id).Scan(
		&driver.ID, &driver.UserID, &driver.FullName, &driver.Phone,
		&driver.VehiclePlate, &driver.VehicleType,
		&driver.IsAvailable, &driver.IsActive,
		&driver.CreatedAt, &driver.UpdatedAt,
		&driver.Latitude, &driver.Longitude, &driver.LastSeenAt,
	)
	if err != nil {
		return nil, err
	}
	if driver.LastSeenAt != nil {
		driver.IsOnline = true
	}
	return driver, nil
}

func (r *driverRepository) FindByUserID(ctx context.Context, userID uuid.UUID) (*domain.Driver, error) {
	query := `
		SELECT 
			d.id, d.user_id, d.full_name, d.phone, d.vehicle_plate, d.vehicle_type, d.is_available, d.is_active, d.created_at, d.updated_at,
			dl.latitude, dl.longitude, dl.recorded_at
		FROM drivers d
		LEFT JOIN LATERAL (
			SELECT latitude, longitude, recorded_at
			FROM driver_locations 
			WHERE driver_id = d.id 
			ORDER BY recorded_at DESC 
			LIMIT 1
		) dl ON true
		WHERE d.user_id = $1 AND d.is_active = true`

	driver := &domain.Driver{}
	err := r.db.QueryRow(ctx, query, userID).Scan(
		&driver.ID, &driver.UserID, &driver.FullName, &driver.Phone,
		&driver.VehiclePlate, &driver.VehicleType,
		&driver.IsAvailable, &driver.IsActive,
		&driver.CreatedAt, &driver.UpdatedAt,
		&driver.Latitude, &driver.Longitude, &driver.LastSeenAt,
	)
	if err != nil {
		return nil, err
	}
	if driver.LastSeenAt != nil {
		driver.IsOnline = true
	}
	return driver, nil
}

func (r *driverRepository) FindAll(ctx context.Context, pagination *domain.PaginationRequest) ([]*domain.Driver, int64, error) {
	pagination.SetDefaults()

	countQuery := `SELECT COUNT(*) FROM drivers WHERE is_active = true`
	args := []interface{}{}
	argIndex := 1

	if pagination.Search != "" {
		countQuery += fmt.Sprintf(` AND (full_name ILIKE $%d OR phone ILIKE $%d OR vehicle_plate ILIKE $%d)`,
			argIndex, argIndex, argIndex)
		args = append(args, "%"+pagination.Search+"%")
		argIndex++
	}

	var total int64
	if err := r.db.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	dataQuery := `
		SELECT 
			d.id, d.user_id, d.full_name, d.phone, d.vehicle_plate, d.vehicle_type, d.is_available, d.is_active, d.created_at, d.updated_at,
			dl.latitude, dl.longitude, dl.recorded_at
		FROM drivers d
		LEFT JOIN LATERAL (
			SELECT latitude, longitude, recorded_at
			FROM driver_locations 
			WHERE driver_id = d.id 
			ORDER BY recorded_at DESC 
			LIMIT 1
		) dl ON true
		WHERE d.is_active = true`

	dataArgs := []interface{}{}
	dataArgIndex := 1

	if pagination.Search != "" {
		dataQuery += fmt.Sprintf(` AND (d.full_name ILIKE $%d OR d.phone ILIKE $%d OR d.vehicle_plate ILIKE $%d)`,
			dataArgIndex, dataArgIndex, dataArgIndex)
		dataArgs = append(dataArgs, "%"+pagination.Search+"%")
		dataArgIndex++
	}

	dataQuery += fmt.Sprintf(` ORDER BY d.%s %s LIMIT $%d OFFSET $%d`,
		sanitizeSortColumn(pagination.SortBy, "created_at"),
		sanitizeOrder(pagination.Order),
		dataArgIndex, dataArgIndex+1)
	dataArgs = append(dataArgs, pagination.PerPage, pagination.Offset())

	rows, err := r.db.Query(ctx, dataQuery, dataArgs...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var drivers []*domain.Driver
	for rows.Next() {
		driver := &domain.Driver{}
		if err := rows.Scan(
			&driver.ID, &driver.UserID, &driver.FullName, &driver.Phone,
			&driver.VehiclePlate, &driver.VehicleType,
			&driver.IsAvailable, &driver.IsActive,
			&driver.CreatedAt, &driver.UpdatedAt,
			&driver.Latitude, &driver.Longitude, &driver.LastSeenAt,
		); err != nil {
			return nil, 0, err
		}
		if driver.LastSeenAt != nil {
			driver.IsOnline = true
		}
		drivers = append(drivers, driver)
	}

	return drivers, total, nil
}

func (r *driverRepository) FindAvailable(ctx context.Context) ([]*domain.Driver, error) {
	query := `
		SELECT 
			d.id, d.user_id, d.full_name, d.phone, d.vehicle_plate, d.vehicle_type, d.is_available, d.is_active, d.created_at, d.updated_at,
			dl.latitude, dl.longitude, dl.recorded_at
		FROM drivers d
		LEFT JOIN LATERAL (
			SELECT latitude, longitude, recorded_at
			FROM driver_locations 
			WHERE driver_id = d.id 
			ORDER BY recorded_at DESC 
			LIMIT 1
		) dl ON true
		WHERE d.is_active = true AND d.is_available = true
		ORDER BY d.full_name ASC`

	rows, err := r.db.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var drivers []*domain.Driver
	for rows.Next() {
		driver := &domain.Driver{}
		if err := rows.Scan(
			&driver.ID, &driver.UserID, &driver.FullName, &driver.Phone,
			&driver.VehiclePlate, &driver.VehicleType,
			&driver.IsAvailable, &driver.IsActive,
			&driver.CreatedAt, &driver.UpdatedAt,
			&driver.Latitude, &driver.Longitude, &driver.LastSeenAt,
		); err != nil {
			return nil, err
		}
		if driver.LastSeenAt != nil {
			driver.IsOnline = true
		}
		drivers = append(drivers, driver)
	}

	return drivers, nil
}

func (r *driverRepository) Update(ctx context.Context, driver *domain.Driver) error {
	query := `
		UPDATE drivers
		SET full_name = $1, phone = $2, vehicle_plate = $3, vehicle_type = $4, is_available = $5, is_active = $6
		WHERE id = $7
		RETURNING updated_at`

	return r.db.QueryRow(ctx, query,
		driver.FullName, driver.Phone, driver.VehiclePlate, driver.VehicleType,
		driver.IsAvailable, driver.IsActive, driver.ID,
	).Scan(&driver.UpdatedAt)
}

func (r *driverRepository) Delete(ctx context.Context, id uuid.UUID) error {
	query := `UPDATE drivers SET is_active = false, is_available = false WHERE id = $1`
	_, err := r.db.Exec(ctx, query, id)
	return err
}
