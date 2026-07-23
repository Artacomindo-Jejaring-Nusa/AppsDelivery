package usecase

import (
	"context"
	"errors"
	"time"

	"backend-delivery/internal/domain"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

type deliveryOrderUsecase struct {
	doRepo   domain.DeliveryOrderRepository
	slaHours int
}

// NewDeliveryOrderUsecase creates a new DeliveryOrderUsecase implementation.
func NewDeliveryOrderUsecase(doRepo domain.DeliveryOrderRepository, slaDefaultHours int) domain.DeliveryOrderUsecase {
	return &deliveryOrderUsecase{
		doRepo:   doRepo,
		slaHours: slaDefaultHours,
	}
}

func (u *deliveryOrderUsecase) Create(ctx context.Context, req *domain.CreateDeliveryOrderRequest, createdBy uuid.UUID) (*domain.DeliveryOrder, error) {
	// Check for duplicate DO number
	existing, _ := u.doRepo.FindByDONumber(ctx, req.DONumber)
	if existing != nil {
		return nil, errors.New("delivery order number already exists")
	}

	slaHours := u.slaHours
	if req.SLAHours > 0 {
		slaHours = req.SLAHours
	}

	now := time.Now()
	slaDeadline := now.Add(time.Duration(slaHours) * time.Hour)

	do := &domain.DeliveryOrder{
		ID:                 uuid.New(),
		DONumber:           req.DONumber,
		BtsSiteID:          req.BtsSiteID,
		Description:        req.Description,
		Status:             domain.DOStatusPending,
		SLAHours:           slaHours,
		SLADeadline:        &slaDeadline,
		SLAStatus:          domain.SLAStatusGreen,
		OriginAddress:      req.OriginAddress,
		DestinationAddress: req.DestinationAddress,
		Notes:              req.Notes,
		CreatedBy:          &createdBy,
	}

	if err := u.doRepo.Create(ctx, do); err != nil {
		return nil, err
	}

	return do, nil
}

func (u *deliveryOrderUsecase) GetByID(ctx context.Context, id uuid.UUID) (*domain.DeliveryOrder, error) {
	do, err := u.doRepo.FindByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errors.New("delivery order not found")
		}
		return nil, err
	}
	return do, nil
}

func (u *deliveryOrderUsecase) GetAll(ctx context.Context, filter *domain.DOFilterRequest) ([]*domain.DeliveryOrder, int64, error) {
	return u.doRepo.FindAll(ctx, filter)
}

func (u *deliveryOrderUsecase) UpdateStatus(ctx context.Context, id uuid.UUID, req *domain.UpdateDOStatusRequest) (*domain.DeliveryOrder, error) {
	do, err := u.doRepo.FindByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errors.New("delivery order not found")
		}
		return nil, err
	}

	// Validate status transition
	if !isValidStatusTransition(do.Status, req.Status) {
		return nil, errors.New("invalid status transition from " + do.Status + " to " + req.Status)
	}

	if err := u.doRepo.UpdateStatus(ctx, id, req.Status, req.Notes); err != nil {
		return nil, err
	}

	do.Status = req.Status
	return do, nil
}

// isValidStatusTransition validates allowed status transitions.
func isValidStatusTransition(current, target string) bool {
	transitions := map[string][]string{
		domain.DOStatusPending:   {domain.DOStatusAssigned, domain.DOStatusCancelled},
		domain.DOStatusAssigned:  {domain.DOStatusInTransit, domain.DOStatusCancelled},
		domain.DOStatusInTransit: {domain.DOStatusDelivered, domain.DOStatusReturned, domain.DOStatusCancelled},
		domain.DOStatusDelivered: {domain.DOStatusCompleted, domain.DOStatusReturned},
		domain.DOStatusReturned:  {domain.DOStatusCompleted},
	}

	allowed, exists := transitions[current]
	if !exists {
		return false
	}

	for _, s := range allowed {
		if s == target {
			return true
		}
	}
	return false
}
