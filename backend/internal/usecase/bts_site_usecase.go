package usecase

import (
	"context"
	"errors"

	"backend-delivery/internal/domain"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

type btsSiteUsecase struct {
	btsSiteRepo domain.BtsSiteRepository
}

// NewBtsSiteUsecase creates a new BtsSiteUsecase implementation.
func NewBtsSiteUsecase(btsSiteRepo domain.BtsSiteRepository) domain.BtsSiteUsecase {
	return &btsSiteUsecase{btsSiteRepo: btsSiteRepo}
}

func (u *btsSiteUsecase) Create(ctx context.Context, req *domain.CreateBtsSiteRequest) (*domain.BtsSite, error) {
	// Check for duplicate site_id
	existing, _ := u.btsSiteRepo.FindBySiteID(ctx, req.SiteID)
	if existing != nil {
		return nil, errors.New("site_id already exists")
	}

	site := &domain.BtsSite{
		ID:        uuid.New(),
		SiteID:    req.SiteID,
		SiteName:  req.SiteName,
		Address:   req.Address,
		Province:  req.Province,
		City:      req.City,
		District:  req.District,
		Latitude:  req.Latitude,
		Longitude: req.Longitude,
		IsActive:  true,
	}

	if err := u.btsSiteRepo.Create(ctx, site); err != nil {
		return nil, err
	}

	return site, nil
}

func (u *btsSiteUsecase) GetByID(ctx context.Context, id uuid.UUID) (*domain.BtsSite, error) {
	site, err := u.btsSiteRepo.FindByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errors.New("BTS site not found")
		}
		return nil, err
	}
	return site, nil
}

func (u *btsSiteUsecase) GetAll(ctx context.Context, pagination *domain.PaginationRequest) ([]*domain.BtsSite, int64, error) {
	return u.btsSiteRepo.FindAll(ctx, pagination)
}

func (u *btsSiteUsecase) Update(ctx context.Context, id uuid.UUID, req *domain.UpdateBtsSiteRequest) (*domain.BtsSite, error) {
	site, err := u.btsSiteRepo.FindByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errors.New("BTS site not found")
		}
		return nil, err
	}

	if req.SiteName != "" {
		site.SiteName = req.SiteName
	}
	if req.Address != "" {
		site.Address = req.Address
	}
	if req.Province != "" {
		site.Province = req.Province
	}
	if req.City != "" {
		site.City = req.City
	}
	if req.District != "" {
		site.District = req.District
	}
	if req.Latitude != nil {
		site.Latitude = req.Latitude
	}
	if req.Longitude != nil {
		site.Longitude = req.Longitude
	}
	if req.IsActive != nil {
		site.IsActive = *req.IsActive
	}

	if err := u.btsSiteRepo.Update(ctx, site); err != nil {
		return nil, err
	}

	return site, nil
}

func (u *btsSiteUsecase) Delete(ctx context.Context, id uuid.UUID) error {
	_, err := u.btsSiteRepo.FindByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return errors.New("BTS site not found")
		}
		return err
	}

	return u.btsSiteRepo.Delete(ctx, id)
}
