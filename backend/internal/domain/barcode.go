package domain

import (
	"context"
	"time"

	"github.com/google/uuid"
)

// Barcode represents a generated QR Code for a dismantle asset.
type Barcode struct {
	ID          uuid.UUID  `json:"id"`
	AssetID     uuid.UUID  `json:"asset_id"`
	BarcodeData string     `json:"barcode_data"`
	BarcodeType string     `json:"barcode_type"`
	ImagePath   string     `json:"image_path"`
	IsScanned   bool       `json:"is_scanned"`
	ScannedAt   *time.Time `json:"scanned_at"`
	ScannedBy   *uuid.UUID `json:"scanned_by"`
	CreatedAt   time.Time  `json:"created_at"`
}

// ---- Repository Interface ----

// BarcodeRepository defines the contract for barcode data access.
type BarcodeRepository interface {
	Create(ctx context.Context, barcode *Barcode) error
	FindByID(ctx context.Context, id uuid.UUID) (*Barcode, error)
	FindByBarcodeData(ctx context.Context, barcodeData string) (*Barcode, error)
	FindByAssetID(ctx context.Context, assetID uuid.UUID) (*Barcode, error)
	MarkScanned(ctx context.Context, id uuid.UUID, scannedBy uuid.UUID) error
}

// ---- Usecase Interface ----

// BarcodeUsecase defines the contract for barcode business logic.
type BarcodeUsecase interface {
	GenerateForAsset(ctx context.Context, assetID uuid.UUID) (*Barcode, error)
	LookupByCode(ctx context.Context, code string) (*Barcode, error)
	MarkScanned(ctx context.Context, code string, scannedBy uuid.UUID) (*Barcode, error)
}
