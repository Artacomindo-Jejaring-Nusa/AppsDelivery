package repository

import (
	"context"
	"time"

	"backend-delivery/internal/domain"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type barcodeRepository struct {
	db *pgxpool.Pool
}

// NewBarcodeRepository creates a new BarcodeRepository implementation.
func NewBarcodeRepository(db *pgxpool.Pool) domain.BarcodeRepository {
	return &barcodeRepository{db: db}
}

func (r *barcodeRepository) Create(ctx context.Context, barcode *domain.Barcode) error {
	query := `
		INSERT INTO barcodes (id, asset_id, barcode_data, barcode_type, image_path)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING created_at`

	if barcode.ID == uuid.Nil {
		barcode.ID = uuid.New()
	}

	return r.db.QueryRow(ctx, query,
		barcode.ID, barcode.AssetID, barcode.BarcodeData,
		barcode.BarcodeType, barcode.ImagePath,
	).Scan(&barcode.CreatedAt)
}

func (r *barcodeRepository) FindByID(ctx context.Context, id uuid.UUID) (*domain.Barcode, error) {
	query := `
		SELECT id, asset_id, barcode_data, barcode_type, image_path, is_scanned, scanned_at, scanned_by, created_at
		FROM barcodes WHERE id = $1`

	bc := &domain.Barcode{}
	err := r.db.QueryRow(ctx, query, id).Scan(
		&bc.ID, &bc.AssetID, &bc.BarcodeData, &bc.BarcodeType,
		&bc.ImagePath, &bc.IsScanned, &bc.ScannedAt, &bc.ScannedBy, &bc.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	return bc, nil
}

func (r *barcodeRepository) FindByBarcodeData(ctx context.Context, barcodeData string) (*domain.Barcode, error) {
	query := `
		SELECT id, asset_id, barcode_data, barcode_type, image_path, is_scanned, scanned_at, scanned_by, created_at
		FROM barcodes WHERE barcode_data = $1`

	bc := &domain.Barcode{}
	err := r.db.QueryRow(ctx, query, barcodeData).Scan(
		&bc.ID, &bc.AssetID, &bc.BarcodeData, &bc.BarcodeType,
		&bc.ImagePath, &bc.IsScanned, &bc.ScannedAt, &bc.ScannedBy, &bc.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	return bc, nil
}

func (r *barcodeRepository) FindByAssetID(ctx context.Context, assetID uuid.UUID) (*domain.Barcode, error) {
	query := `
		SELECT id, asset_id, barcode_data, barcode_type, image_path, is_scanned, scanned_at, scanned_by, created_at
		FROM barcodes WHERE asset_id = $1`

	bc := &domain.Barcode{}
	err := r.db.QueryRow(ctx, query, assetID).Scan(
		&bc.ID, &bc.AssetID, &bc.BarcodeData, &bc.BarcodeType,
		&bc.ImagePath, &bc.IsScanned, &bc.ScannedAt, &bc.ScannedBy, &bc.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	return bc, nil
}

func (r *barcodeRepository) MarkScanned(ctx context.Context, id uuid.UUID, scannedBy uuid.UUID) error {
	query := `UPDATE barcodes SET is_scanned = true, scanned_at = $1, scanned_by = $2 WHERE id = $3`
	_, err := r.db.Exec(ctx, query, time.Now(), scannedBy, id)
	return err
}
