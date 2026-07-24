package usecase

import (
	"context"
	"errors"
	"fmt"
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

	slaDays := 3 // default 3 days
	if req.SLADays > 0 {
		slaDays = req.SLADays
	} else if req.SLAHours > 0 {
		slaDays = (req.SLAHours + 23) / 24
	}

	slaHours := slaDays * 24
	now := time.Now()
	slaDeadline := now.Add(time.Duration(slaHours) * time.Hour)

	do := &domain.DeliveryOrder{
		ID:                 uuid.New(),
		DONumber:           req.DONumber,
		BtsSiteID:          req.BtsSiteID,
		Description:        req.Description,
		Status:             domain.DOStatusPending,
		SLADays:            slaDays,
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

	populateSLADetail(do)
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
	populateSLADetail(do)
	return do, nil
}

func (u *deliveryOrderUsecase) GetAll(ctx context.Context, filter *domain.DOFilterRequest) ([]*domain.DeliveryOrder, int64, error) {
	dos, total, err := u.doRepo.FindAll(ctx, filter)
	if err != nil {
		return nil, 0, err
	}
	for _, do := range dos {
		populateSLADetail(do)
	}
	return dos, total, nil
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
	populateSLADetail(do)
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

// populateSLADetail calculates granular day and hour SLA metrics for a DO.
func populateSLADetail(do *domain.DeliveryOrder) {
	if do == nil || do.SLADeadline == nil {
		return
	}

	targetDays := do.SLADays
	if targetDays <= 0 {
		targetDays = (do.SLAHours + 23) / 24
		if targetDays <= 0 {
			targetDays = 3
		}
	}

	now := time.Now()
	diff := do.SLADeadline.Sub(now)

	isOverdue := diff < 0
	totalHours := int(diff.Hours())

	remainingDays := totalHours / 24
	remainingHours := totalHours % 24

	formatted := ""
	if isOverdue {
		overdueHours := int(-diff.Hours())
		oDays := overdueHours / 24
		oHrs := overdueHours % 24
		if oDays > 0 {
			formatted = fmt.Sprintf("Terlambat %d Hari %d Jam", oDays, oHrs)
		} else {
			formatted = fmt.Sprintf("Terlambat %d Jam", oHrs)
		}
	} else {
		if remainingDays > 0 {
			formatted = fmt.Sprintf("%d Hari %d Jam", remainingDays, remainingHours)
		} else {
			formatted = fmt.Sprintf("%d Jam", remainingHours)
		}
	}

	do.SLADetail = &domain.SLADetailResponse{
		TargetDays:         targetDays,
		TargetText:         fmt.Sprintf("%d Hari", targetDays),
		RemainingDays:      remainingDays,
		RemainingHours:     remainingHours,
		RemainingFormatted: formatted,
		IsOverdue:          isOverdue,
	}
}
