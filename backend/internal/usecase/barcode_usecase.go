package usecase

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"backend-delivery/internal/domain"
	barcodePkg "backend-delivery/pkg/barcode"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)


type barcodeUsecase struct {
	barcodeRepo domain.BarcodeRepository
	assetRepo   domain.DismantleAssetRepository
	doRepo      domain.DeliveryOrderRepository
	generator   *barcodePkg.Generator
}

// NewBarcodeUsecase creates a new BarcodeUsecase implementation.
func NewBarcodeUsecase(
	barcodeRepo domain.BarcodeRepository,
	assetRepo domain.DismantleAssetRepository,
	doRepo domain.DeliveryOrderRepository,
	generator *barcodePkg.Generator,
) domain.BarcodeUsecase {
	return &barcodeUsecase{
		barcodeRepo: barcodeRepo,
		assetRepo:   assetRepo,
		doRepo:      doRepo,
		generator:   generator,
	}
}

func (u *barcodeUsecase) GenerateForAsset(ctx context.Context, assetID uuid.UUID) (*domain.Barcode, error) {
	// Verify asset exists
	asset, err := u.assetRepo.FindByID(ctx, assetID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errors.New("asset not found")
		}
		return nil, err
	}

	// Check if barcode already exists for this asset
	existing, _ := u.barcodeRepo.FindByAssetID(ctx, assetID)
	if existing != nil {
		return existing, nil // Return existing barcode
	}

	// Get DO for barcode data
	do, err := u.doRepo.FindByID(ctx, asset.DeliveryOrderID)
	if err != nil {
		return nil, errors.New("delivery order not found for asset")
	}

	// Generate barcode data string
	timestamp := time.Now().Format("20060102150405")
	barcodeData := fmt.Sprintf("INB-%s-%s-%s", do.DONumber, assetID.String()[:8], timestamp)
	filename := fmt.Sprintf("qr_%s_%s", assetID.String()[:8], timestamp)

	// Generate QR Code image
	imagePath, err := u.generator.GenerateQRCode(barcodeData, filename)
	if err != nil {
		return nil, fmt.Errorf("failed to generate QR code: %w", err)
	}

	barcode := &domain.Barcode{
		ID:          uuid.New(),
		AssetID:     assetID,
		BarcodeData: barcodeData,
		BarcodeType: "qrcode",
		ImagePath:   imagePath,
		IsScanned:   false,
	}

	if err := u.barcodeRepo.Create(ctx, barcode); err != nil {
		return nil, err
	}

	return barcode, nil
}

func (u *barcodeUsecase) LookupByCode(ctx context.Context, code string) (*domain.Barcode, error) {
	barcode, err := u.barcodeRepo.FindByBarcodeData(ctx, code)
	if err == nil && barcode != nil {
		return barcode, nil
	}

	cleanCode := strings.TrimPrefix(code, "INB-")
	do, _ := u.doRepo.FindByDONumber(ctx, cleanCode)
	if do != nil {
		return &domain.Barcode{
			ID:          do.ID,
			BarcodeData: fmt.Sprintf("INB-%s", do.DONumber),
			BarcodeType: "QR_CODE",
			CreatedAt:   do.CreatedAt,
		}, nil
	}

	return nil, errors.New("barcode not found")
}


func (u *barcodeUsecase) MarkScanned(ctx context.Context, code string, scannedBy uuid.UUID) (*domain.Barcode, error) {
	barcode, err := u.barcodeRepo.FindByBarcodeData(ctx, code)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errors.New("barcode not found")
		}
		return nil, err
	}

	if barcode.IsScanned {
		return nil, errors.New("barcode has already been scanned")
	}

	if err := u.barcodeRepo.MarkScanned(ctx, barcode.ID, scannedBy); err != nil {
		return nil, err
	}

	barcode.IsScanned = true
	return barcode, nil
}
