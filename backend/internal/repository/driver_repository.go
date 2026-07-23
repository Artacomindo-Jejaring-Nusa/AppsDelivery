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
		SELECT id, user_id, full_name, phone, vehicle_plate, vehicle_type, is_available, is_active, created_at, updated_at
		FROM drivers WHERE id = $1 AND is_active = true`

	driver := &domain.Driver{}
	err := r.db.QueryRow(ctx, query, id).Scan(
		&driver.ID, &driver.UserID, &driver.FullName, &driver.Phone,
		&driver.VehiclePlate, &driver.VehicleType,
		&driver.IsAvailable, &driver.IsActive,
		&driver.CreatedAt, &driver.UpdatedAt,
	)
	if err != nil {
		return nil, err
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
		SELECT id, user_id, full_name, phone, vehicle_plate, vehicle_type, is_available, is_active, created_at, updated_at
		FROM drivers WHERE is_active = true`

	dataArgs := []interface{}{}
	dataArgIndex := 1

	if pagination.Search != "" {
		dataQuery += fmt.Sprintf(` AND (full_name ILIKE $%d OR phone ILIKE $%d OR vehicle_plate ILIKE $%d)`,
			dataArgIndex, dataArgIndex, dataArgIndex)
		dataArgs = append(dataArgs, "%"+pagination.Search+"%")
		dataArgIndex++
	}

	dataQuery += fmt.Sprintf(` ORDER BY %s %s LIMIT $%d OFFSET $%d`,
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
		); err != nil {
			return nil, 0, err
		}
		drivers = append(drivers, driver)
	}

	return drivers, total, nil
}

func (r *driverRepository) FindAvailable(ctx context.Context) ([]*domain.Driver, error) {
	query := `
		SELECT id, user_id, full_name, phone, vehicle_plate, vehicle_type, is_available, is_active, created_at, updated_at
		FROM drivers WHERE is_active = true AND is_available = true
		ORDER BY full_name ASC`

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
		); err != nil {
			return nil, err
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
