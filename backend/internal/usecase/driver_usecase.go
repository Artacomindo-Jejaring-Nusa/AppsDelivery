package usecase

import (
	"context"
	"errors"

	"backend-delivery/internal/domain"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

type driverUsecase struct {
	driverRepo domain.DriverRepository
}

// NewDriverUsecase creates a new DriverUsecase implementation.
func NewDriverUsecase(driverRepo domain.DriverRepository) domain.DriverUsecase {
	return &driverUsecase{driverRepo: driverRepo}
}

func (u *driverUsecase) Create(ctx context.Context, req *domain.CreateDriverRequest) (*domain.Driver, error) {
	driver := &domain.Driver{
		ID:           uuid.New(),
		UserID:       req.UserID,
		FullName:     req.FullName,
		Phone:        req.Phone,
		VehiclePlate: req.VehiclePlate,
		VehicleType:  req.VehicleType,
		IsAvailable:  true,
		IsActive:     true,
	}

	if err := u.driverRepo.Create(ctx, driver); err != nil {
		return nil, err
	}

	return driver, nil
}

func (u *driverUsecase) GetByID(ctx context.Context, id uuid.UUID) (*domain.Driver, error) {
	driver, err := u.driverRepo.FindByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errors.New("driver not found")
		}
		return nil, err
	}
	return driver, nil
}

func (u *driverUsecase) GetAll(ctx context.Context, pagination *domain.PaginationRequest) ([]*domain.Driver, int64, error) {
	return u.driverRepo.FindAll(ctx, pagination)
}

func (u *driverUsecase) Update(ctx context.Context, id uuid.UUID, req *domain.UpdateDriverRequest) (*domain.Driver, error) {
	driver, err := u.driverRepo.FindByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errors.New("driver not found")
		}
		return nil, err
	}

	if req.FullName != "" {
		driver.FullName = req.FullName
	}
	if req.Phone != "" {
		driver.Phone = req.Phone
	}
	if req.VehiclePlate != "" {
		driver.VehiclePlate = req.VehiclePlate
	}
	if req.VehicleType != "" {
		driver.VehicleType = req.VehicleType
	}
	if req.IsAvailable != nil {
		driver.IsAvailable = *req.IsAvailable
	}
	if req.IsActive != nil {
		driver.IsActive = *req.IsActive
	}

	if err := u.driverRepo.Update(ctx, driver); err != nil {
		return nil, err
	}

	return driver, nil
}

func (u *driverUsecase) Delete(ctx context.Context, id uuid.UUID) error {
	_, err := u.driverRepo.FindByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return errors.New("driver not found")
		}
		return err
	}

	return u.driverRepo.Delete(ctx, id)
}
