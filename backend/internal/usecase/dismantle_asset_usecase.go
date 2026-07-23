package usecase

import (
	"context"
	"errors"

	"backend-delivery/internal/domain"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

type dismantleAssetUsecase struct {
	assetRepo domain.DismantleAssetRepository
	doRepo    domain.DeliveryOrderRepository
}

// NewDismantleAssetUsecase creates a new DismantleAssetUsecase implementation.
func NewDismantleAssetUsecase(assetRepo domain.DismantleAssetRepository, doRepo domain.DeliveryOrderRepository) domain.DismantleAssetUsecase {
	return &dismantleAssetUsecase{
		assetRepo: assetRepo,
		doRepo:    doRepo,
	}
}

func (u *dismantleAssetUsecase) Create(ctx context.Context, doID uuid.UUID, req *domain.CreateDismantleAssetRequest, createdBy uuid.UUID) (*domain.DismantleAsset, error) {
	// Verify DO exists
	_, err := u.doRepo.FindByID(ctx, doID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errors.New("delivery order not found")
		}
		return nil, err
	}

	asset := &domain.DismantleAsset{
		ID:              uuid.New(),
		DeliveryOrderID: doID,
		Category:        req.Category,
		ItemName:        req.ItemName,
		SerialNumber:    req.SerialNumber,
		Quantity:        req.Quantity,
		Unit:            req.Unit,
		Condition:       req.Condition,
		Notes:           req.Notes,
		CreatedBy:       &createdBy,
	}

	if asset.Condition == "" {
		asset.Condition = "good"
	}

	if err := u.assetRepo.Create(ctx, asset); err != nil {
		return nil, err
	}

	return asset, nil
}

func (u *dismantleAssetUsecase) CreateBatch(ctx context.Context, doID uuid.UUID, req *domain.BatchCreateDismantleAssetRequest, createdBy uuid.UUID) ([]*domain.DismantleAsset, error) {
	// Verify DO exists
	_, err := u.doRepo.FindByID(ctx, doID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errors.New("delivery order not found")
		}
		return nil, err
	}

	var assets []*domain.DismantleAsset
	for _, item := range req.Assets {
		condition := item.Condition
		if condition == "" {
			condition = "good"
		}
		asset := &domain.DismantleAsset{
			ID:              uuid.New(),
			DeliveryOrderID: doID,
			Category:        item.Category,
			ItemName:        item.ItemName,
			SerialNumber:    item.SerialNumber,
			Quantity:        item.Quantity,
			Unit:            item.Unit,
			Condition:       condition,
			Notes:           item.Notes,
			CreatedBy:       &createdBy,
		}
		assets = append(assets, asset)
	}

	if err := u.assetRepo.CreateBatch(ctx, assets); err != nil {
		return nil, err
	}

	return assets, nil
}

func (u *dismantleAssetUsecase) GetByDeliveryOrderID(ctx context.Context, doID uuid.UUID, pagination *domain.PaginationRequest) ([]*domain.DismantleAsset, int64, error) {
	return u.assetRepo.FindByDeliveryOrderID(ctx, doID, pagination)
}

func (u *dismantleAssetUsecase) Update(ctx context.Context, id uuid.UUID, req *domain.UpdateDismantleAssetRequest) (*domain.DismantleAsset, error) {
	asset, err := u.assetRepo.FindByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errors.New("asset not found")
		}
		return nil, err
	}

	if req.Category != "" {
		asset.Category = req.Category
	}
	if req.ItemName != "" {
		asset.ItemName = req.ItemName
	}
	if req.SerialNumber != "" {
		asset.SerialNumber = req.SerialNumber
	}
	if req.Quantity != nil {
		asset.Quantity = *req.Quantity
	}
	if req.Unit != "" {
		asset.Unit = req.Unit
	}
	if req.Condition != "" {
		asset.Condition = req.Condition
	}
	if req.Notes != "" {
		asset.Notes = req.Notes
	}

	if err := u.assetRepo.Update(ctx, asset); err != nil {
		return nil, err
	}

	return asset, nil
}

func (u *dismantleAssetUsecase) Delete(ctx context.Context, id uuid.UUID) error {
	_, err := u.assetRepo.FindByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return errors.New("asset not found")
		}
		return err
	}

	return u.assetRepo.Delete(ctx, id)
}
