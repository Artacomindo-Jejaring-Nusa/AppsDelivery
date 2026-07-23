package usecase

import (
	"context"
	"errors"

	"backend-delivery/internal/domain"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

type driverLocationUsecase struct {
	locRepo    domain.DriverLocationRepository
	driverRepo domain.DriverRepository
}

// NewDriverLocationUsecase creates a new DriverLocationUsecase implementation.
func NewDriverLocationUsecase(locRepo domain.DriverLocationRepository, driverRepo domain.DriverRepository) domain.DriverLocationUsecase {
	return &driverLocationUsecase{
		locRepo:    locRepo,
		driverRepo: driverRepo,
	}
}

func (u *driverLocationUsecase) Track(ctx context.Context, driverUserID uuid.UUID, req *domain.SaveDriverLocationRequest) (*domain.DriverLocation, error) {
	// Find driver ID using user_id from token
	driver, err := u.driverRepo.FindByUserID(ctx, driverUserID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errors.New("current user is not registered as a driver")
		}
		return nil, err
	}

	loc := &domain.DriverLocation{
		ID:        uuid.New(),
		DriverID:  driver.ID,
		Latitude:  req.Latitude,
		Longitude: req.Longitude,
	}

	if err := u.locRepo.Save(ctx, loc); err != nil {
		return nil, err
	}

	return loc, nil
}

func (u *driverLocationUsecase) GetLatest(ctx context.Context, driverID uuid.UUID) (*domain.DriverLocation, error) {
	// Check if driver exists
	_, err := u.driverRepo.FindByID(ctx, driverID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errors.New("driver not found")
		}
		return nil, err
	}

	loc, err := u.locRepo.GetLatestByDriverID(ctx, driverID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errors.New("no location logged yet for this driver")
		}
		return nil, err
	}

	return loc, nil
}

func (u *driverLocationUsecase) GetHistory(ctx context.Context, driverID uuid.UUID, limit int) ([]*domain.DriverLocation, error) {
	// Check if driver exists
	_, err := u.driverRepo.FindByID(ctx, driverID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errors.New("driver not found")
		}
		return nil, err
	}

	return u.locRepo.GetHistoryByDriverID(ctx, driverID, limit)
}
