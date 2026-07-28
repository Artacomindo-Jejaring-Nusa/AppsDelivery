package repository

import (
	"context"
	"fmt"

	"backend-delivery/internal/domain"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type manifestRepository struct {
	db *pgxpool.Pool
}

// NewManifestRepository creates a new ManifestRepository implementation.
func NewManifestRepository(db *pgxpool.Pool) domain.ManifestRepository {
	return &manifestRepository{db: db}
}

func (r *manifestRepository) Create(ctx context.Context, manifest *domain.Manifest) error {
	query := `
		INSERT INTO manifests (id, manifest_number, driver_id, status, notes, created_by)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING created_at, updated_at`

	if manifest.ID == uuid.Nil {
		manifest.ID = uuid.New()
	}

	return r.db.QueryRow(ctx, query,
		manifest.ID, manifest.ManifestNumber, manifest.DriverID,
		manifest.Status, manifest.Notes, manifest.CreatedBy,
	).Scan(&manifest.CreatedAt, &manifest.UpdatedAt)
}

func (r *manifestRepository) AddItems(ctx context.Context, manifestID uuid.UUID, doIDs []uuid.UUID) error {
	for i, doID := range doIDs {
		query := `
			INSERT INTO manifest_items (id, manifest_id, delivery_order_id, sequence_number)
			VALUES ($1, $2, $3, $4)`
		_, err := r.db.Exec(ctx, query, uuid.New(), manifestID, doID, i+1)
		if err != nil {
			return err
		}
	}
	return nil
}

func (r *manifestRepository) FindByID(ctx context.Context, id uuid.UUID) (*domain.Manifest, error) {
	query := `
		SELECT m.id, m.manifest_number, m.driver_id, m.status, m.dispatch_date, m.completed_date, m.notes, m.created_by, m.created_at, m.updated_at,
			   d.id, d.full_name, d.phone, d.vehicle_plate, d.vehicle_type
		FROM manifests m
		LEFT JOIN drivers d ON m.driver_id = d.id
		WHERE m.id = $1`

	manifest := &domain.Manifest{}
	driver := &domain.Driver{}

	var driverID *uuid.UUID
	var driverName, driverPhone, driverPlate, driverType *string

	err := r.db.QueryRow(ctx, query, id).Scan(
		&manifest.ID, &manifest.ManifestNumber, &manifest.DriverID,
		&manifest.Status, &manifest.DispatchDate, &manifest.CompletedDate,
		&manifest.Notes, &manifest.CreatedBy, &manifest.CreatedAt, &manifest.UpdatedAt,
		&driverID, &driverName, &driverPhone, &driverPlate, &driverType,
	)
	if err != nil {
		return nil, err
	}

	if driverID != nil {
		driver.ID = *driverID
		if driverName != nil {
			driver.FullName = *driverName
		}
		if driverPhone != nil {
			driver.Phone = *driverPhone
		}
		if driverPlate != nil {
			driver.VehiclePlate = *driverPlate
		}
		if driverType != nil {
			driver.VehicleType = *driverType
		}
		manifest.Driver = driver
	}

	return manifest, nil
}

func (r *manifestRepository) FindAll(ctx context.Context, pagination *domain.PaginationRequest) ([]*domain.Manifest, int64, error) {
	pagination.SetDefaults()

	countQuery := `SELECT COUNT(*) FROM manifests WHERE 1=1`
	args := []interface{}{}
	argIndex := 1

	if pagination.Search != "" {
		countQuery += fmt.Sprintf(` AND manifest_number ILIKE $%d`, argIndex)
		args = append(args, "%"+pagination.Search+"%")
		argIndex++
	}

	var total int64
	if err := r.db.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	dataQuery := `
		SELECT m.id, m.manifest_number, m.driver_id, m.status, m.dispatch_date, m.completed_date, m.notes, m.created_by, m.created_at, m.updated_at
		FROM manifests m WHERE 1=1`

	dataArgs := []interface{}{}
	dataArgIndex := 1

	if pagination.Search != "" {
		dataQuery += fmt.Sprintf(` AND m.manifest_number ILIKE $%d`, dataArgIndex)
		dataArgs = append(dataArgs, "%"+pagination.Search+"%")
		dataArgIndex++
	}

	dataQuery += fmt.Sprintf(` ORDER BY m.%s %s LIMIT $%d OFFSET $%d`,
		sanitizeSortColumn(pagination.SortBy, "created_at"),
		sanitizeOrder(pagination.Order),
		dataArgIndex, dataArgIndex+1)
	dataArgs = append(dataArgs, pagination.PerPage, pagination.Offset())

	rows, err := r.db.Query(ctx, dataQuery, dataArgs...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var manifests []*domain.Manifest
	for rows.Next() {
		m := &domain.Manifest{}
		if err := rows.Scan(
			&m.ID, &m.ManifestNumber, &m.DriverID,
			&m.Status, &m.DispatchDate, &m.CompletedDate,
			&m.Notes, &m.CreatedBy, &m.CreatedAt, &m.UpdatedAt,
		); err != nil {
			return nil, 0, err
		}
		manifests = append(manifests, m)
	}

	return manifests, total, nil
}

func (r *manifestRepository) FindItemsByManifestID(ctx context.Context, manifestID uuid.UUID) ([]*domain.ManifestItem, error) {
	query := `
		SELECT mi.id, mi.manifest_id, mi.delivery_order_id, mi.sequence_number, mi.created_at,
			   dord.do_number, dord.status, dord.sla_status, dord.description, dord.origin_address, dord.destination_address
		FROM manifest_items mi
		JOIN delivery_orders dord ON mi.delivery_order_id = dord.id
		WHERE mi.manifest_id = $1
		ORDER BY mi.sequence_number ASC`

	rows, err := r.db.Query(ctx, query, manifestID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []*domain.ManifestItem
	for rows.Next() {
		item := &domain.ManifestItem{}
		do := &domain.DeliveryOrder{}
		if err := rows.Scan(
			&item.ID, &item.ManifestID, &item.DeliveryOrderID, &item.SequenceNumber, &item.CreatedAt,
			&do.DONumber, &do.Status, &do.SLAStatus, &do.Description, &do.OriginAddress, &do.DestinationAddress,
		); err != nil {
			return nil, err
		}
		do.ID = item.DeliveryOrderID
		item.DeliveryOrder = do
		items = append(items, item)
	}

	return items, nil
}

func (r *manifestRepository) UpdateStatus(ctx context.Context, id uuid.UUID, status string) error {
	query := `UPDATE manifests SET status = $1 WHERE id = $2`
	if status == domain.ManifestStatusDispatched {
		query = `UPDATE manifests SET status = $1, dispatch_date = NOW() WHERE id = $2`
	} else if status == domain.ManifestStatusCompleted {
		query = `UPDATE manifests SET status = $1, completed_date = NOW() WHERE id = $2`
	}
	_, err := r.db.Exec(ctx, query, status, id)
	return err
}
