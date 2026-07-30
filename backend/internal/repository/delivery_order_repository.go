package repository

import (
	"context"
	"fmt"

	"backend-delivery/internal/domain"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type deliveryOrderRepository struct {
	db *pgxpool.Pool
}

// NewDeliveryOrderRepository creates a new DeliveryOrderRepository implementation.
func NewDeliveryOrderRepository(db *pgxpool.Pool) domain.DeliveryOrderRepository {
	return &deliveryOrderRepository{db: db}
}

func (r *deliveryOrderRepository) Create(ctx context.Context, do *domain.DeliveryOrder) error {
	query := `
		INSERT INTO delivery_orders (id, do_number, bts_site_id, description, status, sla_days, sla_hours, sla_deadline, sla_status, origin_address, destination_address, notes, created_by)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
		RETURNING created_at, updated_at`

	if do.ID == uuid.Nil {
		do.ID = uuid.New()
	}

	return r.db.QueryRow(ctx, query,
		do.ID, do.DONumber, do.BtsSiteID, do.Description,
		do.Status, do.SLADays, do.SLAHours, do.SLADeadline, do.SLAStatus,
		do.OriginAddress, do.DestinationAddress, do.Notes, do.CreatedBy,
	).Scan(&do.CreatedAt, &do.UpdatedAt)
}

func (r *deliveryOrderRepository) FindByID(ctx context.Context, id uuid.UUID) (*domain.DeliveryOrder, error) {
	query := `
		SELECT dord.id, dord.do_number, dord.bts_site_id, dord.description, dord.status,
			   dord.sla_days, dord.sla_hours, dord.sla_deadline, dord.sla_status, dord.origin_address, dord.destination_address,
			   dord.notes, dord.created_by, dord.created_at, dord.updated_at, dord.deleted_at,
			   bs.id, bs.site_id, bs.site_name, bs.address, bs.province, bs.city, bs.district,
			   drv.id, drv.full_name, drv.vehicle_plate, drv.vehicle_type
		FROM delivery_orders dord
		LEFT JOIN bts_sites bs ON dord.bts_site_id = bs.id
		LEFT JOIN manifest_items mi ON dord.id = mi.delivery_order_id
		LEFT JOIN manifests m ON mi.manifest_id = m.id
		LEFT JOIN drivers drv ON m.driver_id = drv.id
		WHERE dord.id = $1 AND dord.deleted_at IS NULL`

	doEntity := &domain.DeliveryOrder{}
	bts := &domain.BtsSite{}

	var btsID, btsSiteID, btsSiteName, btsAddress, btsProvince, btsCity, btsDistrict *string
	var drvUUID *uuid.UUID
	var drvFullName, drvPlate, drvType *string

	err := r.db.QueryRow(ctx, query, id).Scan(
		&doEntity.ID, &doEntity.DONumber, &doEntity.BtsSiteID, &doEntity.Description,
		&doEntity.Status, &doEntity.SLADays, &doEntity.SLAHours, &doEntity.SLADeadline, &doEntity.SLAStatus,
		&doEntity.OriginAddress, &doEntity.DestinationAddress, &doEntity.Notes,
		&doEntity.CreatedBy, &doEntity.CreatedAt, &doEntity.UpdatedAt, &doEntity.DeletedAt,
		&btsID, &btsSiteID, &btsSiteName, &btsAddress, &btsProvince, &btsCity, &btsDistrict,
		&drvUUID, &drvFullName, &drvPlate, &drvType,
	)
	if err != nil {
		return nil, err
	}

	if btsSiteID != nil {
		bts.SiteID = *btsSiteID
		bts.SiteName = *btsSiteName
		if btsAddress != nil {
			bts.Address = *btsAddress
		}
		if btsProvince != nil {
			bts.Province = *btsProvince
		}
		if btsCity != nil {
			bts.City = *btsCity
		}
		if btsDistrict != nil {
			bts.District = *btsDistrict
		}
		doEntity.BtsSite = bts
	}

	if drvUUID != nil {
		drv := &domain.Driver{
			ID: *drvUUID,
		}
		if drvFullName != nil {
			drv.FullName = *drvFullName
		}
		if drvPlate != nil {
			drv.VehiclePlate = *drvPlate
		}
		if drvType != nil {
			drv.VehicleType = *drvType
		}
		doEntity.Driver = drv
	}

	return doEntity, nil
}

func (r *deliveryOrderRepository) FindByDONumber(ctx context.Context, doNumber string) (*domain.DeliveryOrder, error) {
	query := `
		SELECT id, do_number, bts_site_id, description, status, sla_days, sla_hours, sla_deadline, sla_status,
			   origin_address, destination_address, notes, created_by, created_at, updated_at, deleted_at
		FROM delivery_orders WHERE do_number = $1 AND deleted_at IS NULL`

	do := &domain.DeliveryOrder{}
	err := r.db.QueryRow(ctx, query, doNumber).Scan(
		&do.ID, &do.DONumber, &do.BtsSiteID, &do.Description,
		&do.Status, &do.SLADays, &do.SLAHours, &do.SLADeadline, &do.SLAStatus,
		&do.OriginAddress, &do.DestinationAddress, &do.Notes,
		&do.CreatedBy, &do.CreatedAt, &do.UpdatedAt, &do.DeletedAt,
	)
	if err != nil {
		return nil, err
	}
	return do, nil
}

func (r *deliveryOrderRepository) FindAll(ctx context.Context, filter *domain.DOFilterRequest) ([]*domain.DeliveryOrder, int64, error) {
	filter.SetDefaults()

	countQuery := `SELECT COUNT(*) FROM delivery_orders WHERE deleted_at IS NULL`
	args := []interface{}{}
	argIndex := 1

	if filter.Search != "" {
		countQuery += fmt.Sprintf(` AND (do_number ILIKE $%d OR description ILIKE $%d)`, argIndex, argIndex)
		args = append(args, "%"+filter.Search+"%")
		argIndex++
	}
	if filter.Status != "" {
		countQuery += fmt.Sprintf(` AND status = $%d`, argIndex)
		args = append(args, filter.Status)
		argIndex++
	}
	if filter.SLAStatus != "" {
		countQuery += fmt.Sprintf(` AND sla_status = $%d`, argIndex)
		args = append(args, filter.SLAStatus)
		argIndex++
	}
	if filter.BtsSiteID != "" {
		countQuery += fmt.Sprintf(` AND bts_site_id = $%d`, argIndex)
		args = append(args, filter.BtsSiteID)
		argIndex++
	}

	var total int64
	if err := r.db.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	dataQuery := `
		SELECT dord.id, dord.do_number, dord.bts_site_id, dord.description, dord.status,
			   dord.sla_days, dord.sla_hours, dord.sla_deadline, dord.sla_status,
			   dord.origin_address, dord.destination_address, dord.notes,
			   dord.created_by, dord.created_at, dord.updated_at,
			   bs.id, bs.site_id, bs.site_name, bs.address, bs.province, bs.city, bs.district,
			   drv.id, drv.full_name, drv.vehicle_plate, drv.vehicle_type
		FROM delivery_orders dord
		LEFT JOIN bts_sites bs ON dord.bts_site_id = bs.id
		LEFT JOIN manifest_items mi ON dord.id = mi.delivery_order_id
		LEFT JOIN manifests m ON mi.manifest_id = m.id
		LEFT JOIN drivers drv ON m.driver_id = drv.id
		WHERE dord.deleted_at IS NULL`

	dataArgs := []interface{}{}
	dataArgIndex := 1

	if filter.Search != "" {
		dataQuery += fmt.Sprintf(` AND (dord.do_number ILIKE $%d OR dord.description ILIKE $%d OR bs.site_id ILIKE $%d OR bs.site_name ILIKE $%d)`, dataArgIndex, dataArgIndex, dataArgIndex, dataArgIndex)
		dataArgs = append(dataArgs, "%"+filter.Search+"%")
		dataArgIndex++
	}
	if filter.Status != "" {
		dataQuery += fmt.Sprintf(` AND dord.status = $%d`, dataArgIndex)
		dataArgs = append(dataArgs, filter.Status)
		dataArgIndex++
	}
	if filter.SLAStatus != "" {
		dataQuery += fmt.Sprintf(` AND dord.sla_status = $%d`, dataArgIndex)
		dataArgs = append(dataArgs, filter.SLAStatus)
		dataArgIndex++
	}
	if filter.BtsSiteID != "" {
		dataQuery += fmt.Sprintf(` AND dord.bts_site_id = $%d`, dataArgIndex)
		dataArgs = append(dataArgs, filter.BtsSiteID)
		dataArgIndex++
	}

	dataQuery += fmt.Sprintf(` ORDER BY dord.%s %s LIMIT $%d OFFSET $%d`,
		sanitizeSortColumn(filter.SortBy, "created_at"),
		sanitizeOrder(filter.Order),
		dataArgIndex, dataArgIndex+1)
	dataArgs = append(dataArgs, filter.PerPage, filter.Offset())

	rows, err := r.db.Query(ctx, dataQuery, dataArgs...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var orders []*domain.DeliveryOrder
	for rows.Next() {
		do := &domain.DeliveryOrder{}
		bts := &domain.BtsSite{}
		var btsUUID *uuid.UUID
		var btsSiteID, btsSiteName, btsAddress, btsProvince, btsCity, btsDistrict *string
		var drvUUID *uuid.UUID
		var drvFullName, drvPlate, drvType *string

		if err := rows.Scan(
			&do.ID, &do.DONumber, &do.BtsSiteID, &do.Description,
			&do.Status, &do.SLADays, &do.SLAHours, &do.SLADeadline, &do.SLAStatus,
			&do.OriginAddress, &do.DestinationAddress, &do.Notes,
			&do.CreatedBy, &do.CreatedAt, &do.UpdatedAt,
			&btsUUID, &btsSiteID, &btsSiteName, &btsAddress, &btsProvince, &btsCity, &btsDistrict,
			&drvUUID, &drvFullName, &drvPlate, &drvType,
		); err != nil {
			return nil, 0, err
		}

		if btsUUID != nil {
			bts.ID = *btsUUID
			if btsSiteID != nil {
				bts.SiteID = *btsSiteID
			}
			if btsSiteName != nil {
				bts.SiteName = *btsSiteName
			}
			if btsAddress != nil {
				bts.Address = *btsAddress
			}
			if btsProvince != nil {
				bts.Province = *btsProvince
			}
			if btsCity != nil {
				bts.City = *btsCity
			}
			if btsDistrict != nil {
				bts.District = *btsDistrict
			}
			do.BtsSite = bts
		}

		if drvUUID != nil {
			drv := &domain.Driver{
				ID: *drvUUID,
			}
			if drvFullName != nil {
				drv.FullName = *drvFullName
			}
			if drvPlate != nil {
				drv.VehiclePlate = *drvPlate
			}
			if drvType != nil {
				drv.VehicleType = *drvType
			}
			do.Driver = drv
		}

		orders = append(orders, do)
	}

	return orders, total, nil
}

func (r *deliveryOrderRepository) UpdateStatus(ctx context.Context, id uuid.UUID, status, notes string) error {
	query := `UPDATE delivery_orders SET status = $1, notes = $2 WHERE id = $3 AND deleted_at IS NULL`
	_, err := r.db.Exec(ctx, query, status, notes, id)
	return err
}

func (r *deliveryOrderRepository) UpdateSLAStatus(ctx context.Context, id uuid.UUID, slaStatus string) error {
	query := `UPDATE delivery_orders SET sla_status = $1 WHERE id = $2 AND deleted_at IS NULL`
	_, err := r.db.Exec(ctx, query, slaStatus, id)
	return err
}

func (r *deliveryOrderRepository) FindPendingForSLA(ctx context.Context) ([]*domain.DeliveryOrder, error) {
	query := `
		SELECT id, do_number, bts_site_id, description, status, sla_days, sla_hours, sla_deadline, sla_status,
			   origin_address, destination_address, notes, created_by, created_at, updated_at
		FROM delivery_orders
		WHERE deleted_at IS NULL
		  AND status NOT IN ('completed', 'cancelled')
		  AND sla_deadline IS NOT NULL`

	rows, err := r.db.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var orders []*domain.DeliveryOrder
	for rows.Next() {
		do := &domain.DeliveryOrder{}
		if err := rows.Scan(
			&do.ID, &do.DONumber, &do.BtsSiteID, &do.Description,
			&do.Status, &do.SLADays, &do.SLAHours, &do.SLADeadline, &do.SLAStatus,
			&do.OriginAddress, &do.DestinationAddress, &do.Notes,
			&do.CreatedBy, &do.CreatedAt, &do.UpdatedAt,
		); err != nil {
			return nil, err
		}
		orders = append(orders, do)
	}

	return orders, nil
}

func (r *deliveryOrderRepository) SoftDelete(ctx context.Context, id uuid.UUID) error {
	query := `UPDATE delivery_orders SET deleted_at = NOW() WHERE id = $1`
	_, err := r.db.Exec(ctx, query, id)
	return err
}
