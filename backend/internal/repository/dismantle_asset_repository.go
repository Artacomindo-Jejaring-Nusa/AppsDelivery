package repository

import (
	"context"
	"fmt"

	"backend-delivery/internal/domain"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type dismantleAssetRepository struct {
	db *pgxpool.Pool
}

// NewDismantleAssetRepository creates a new DismantleAssetRepository implementation.
func NewDismantleAssetRepository(db *pgxpool.Pool) domain.DismantleAssetRepository {
	return &dismantleAssetRepository{db: db}
}

func (r *dismantleAssetRepository) Create(ctx context.Context, asset *domain.DismantleAsset) error {
	query := `
		INSERT INTO dismantle_assets (id, delivery_order_id, category, item_name, serial_number, quantity, unit, condition, notes, created_by)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		RETURNING created_at, updated_at`

	if asset.ID == uuid.Nil {
		asset.ID = uuid.New()
	}

	return r.db.QueryRow(ctx, query,
		asset.ID, asset.DeliveryOrderID, asset.Category, asset.ItemName,
		asset.SerialNumber, asset.Quantity, asset.Unit, asset.Condition,
		asset.Notes, asset.CreatedBy,
	).Scan(&asset.CreatedAt, &asset.UpdatedAt)
}

func (r *dismantleAssetRepository) CreateBatch(ctx context.Context, assets []*domain.DismantleAsset) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	query := `
		INSERT INTO dismantle_assets (id, delivery_order_id, category, item_name, serial_number, quantity, unit, condition, notes, created_by)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		RETURNING created_at, updated_at`

	for _, asset := range assets {
		if asset.ID == uuid.Nil {
			asset.ID = uuid.New()
		}
		err := tx.QueryRow(ctx, query,
			asset.ID, asset.DeliveryOrderID, asset.Category, asset.ItemName,
			asset.SerialNumber, asset.Quantity, asset.Unit, asset.Condition,
			asset.Notes, asset.CreatedBy,
		).Scan(&asset.CreatedAt, &asset.UpdatedAt)
		if err != nil {
			return err
		}
	}

	return tx.Commit(ctx)
}

func (r *dismantleAssetRepository) FindByID(ctx context.Context, id uuid.UUID) (*domain.DismantleAsset, error) {
	query := `
		SELECT id, delivery_order_id, category, item_name, serial_number, quantity, unit, condition, notes, created_by, created_at, updated_at
		FROM dismantle_assets WHERE id = $1`

	asset := &domain.DismantleAsset{}
	err := r.db.QueryRow(ctx, query, id).Scan(
		&asset.ID, &asset.DeliveryOrderID, &asset.Category, &asset.ItemName,
		&asset.SerialNumber, &asset.Quantity, &asset.Unit, &asset.Condition,
		&asset.Notes, &asset.CreatedBy, &asset.CreatedAt, &asset.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return asset, nil
}

func (r *dismantleAssetRepository) FindByDeliveryOrderID(ctx context.Context, doID uuid.UUID, pagination *domain.PaginationRequest) ([]*domain.DismantleAsset, int64, error) {
	pagination.SetDefaults()

	countQuery := `SELECT COUNT(*) FROM dismantle_assets WHERE delivery_order_id = $1`
	countArgs := []interface{}{doID}
	argIndex := 2

	if pagination.Search != "" {
		countQuery += fmt.Sprintf(` AND (item_name ILIKE $%d OR serial_number ILIKE $%d OR category ILIKE $%d)`,
			argIndex, argIndex, argIndex)
		countArgs = append(countArgs, "%"+pagination.Search+"%")
		argIndex++
	}

	var total int64
	if err := r.db.QueryRow(ctx, countQuery, countArgs...).Scan(&total); err != nil {
		return nil, 0, err
	}

	dataQuery := `
		SELECT id, delivery_order_id, category, item_name, serial_number, quantity, unit, condition, notes, created_by, created_at, updated_at
		FROM dismantle_assets WHERE delivery_order_id = $1`

	dataArgs := []interface{}{doID}
	dataArgIndex := 2

	if pagination.Search != "" {
		dataQuery += fmt.Sprintf(` AND (item_name ILIKE $%d OR serial_number ILIKE $%d OR category ILIKE $%d)`,
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

	var assets []*domain.DismantleAsset
	for rows.Next() {
		asset := &domain.DismantleAsset{}
		if err := rows.Scan(
			&asset.ID, &asset.DeliveryOrderID, &asset.Category, &asset.ItemName,
			&asset.SerialNumber, &asset.Quantity, &asset.Unit, &asset.Condition,
			&asset.Notes, &asset.CreatedBy, &asset.CreatedAt, &asset.UpdatedAt,
		); err != nil {
			return nil, 0, err
		}
		assets = append(assets, asset)
	}

	return assets, total, nil
}

func (r *dismantleAssetRepository) Update(ctx context.Context, asset *domain.DismantleAsset) error {
	query := `
		UPDATE dismantle_assets
		SET category = $1, item_name = $2, serial_number = $3, quantity = $4, unit = $5, condition = $6, notes = $7
		WHERE id = $8
		RETURNING updated_at`

	return r.db.QueryRow(ctx, query,
		asset.Category, asset.ItemName, asset.SerialNumber, asset.Quantity,
		asset.Unit, asset.Condition, asset.Notes, asset.ID,
	).Scan(&asset.UpdatedAt)
}

func (r *dismantleAssetRepository) Delete(ctx context.Context, id uuid.UUID) error {
	query := `DELETE FROM dismantle_assets WHERE id = $1`
	_, err := r.db.Exec(ctx, query, id)
	return err
}
