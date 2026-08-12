package usecase

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"backend-delivery/internal/domain"
	"backend-delivery/pkg/ws"

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

	deliveryType := req.Type
	if deliveryType != domain.DeliveryTypeInbound && deliveryType != domain.DeliveryTypeOutbound {
		// Auto-detect based on destination address or notes
		dest := req.DestinationAddress
		if req.BtsSiteID == nil || (dest != "" && (timeContains(dest, "gudang") || timeContains(dest, "ericsson"))) {
			deliveryType = domain.DeliveryTypeOutbound
		} else {
			deliveryType = domain.DeliveryTypeInbound
		}
	}

	do := &domain.DeliveryOrder{
		ID:                 uuid.New(),
		DONumber:           req.DONumber,
		BtsSiteID:          req.BtsSiteID,
		Type:               deliveryType,
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

	// Broadcast WebSocket notification to Admin Dashboard
	go func(doNum, status string) {
		hub := ws.GetHub()
		title := ""
		msg := ""
		notifType := "info"

		switch status {
		case domain.DOStatusInTransit:
			title = "DO In Transit"
			msg = fmt.Sprintf("Delivery Order %s is now in transit", doNum)
			notifType = "info"
		case domain.DOStatusDelivered:
			title = "DO Delivered"
			msg = fmt.Sprintf("Delivery Order %s has been successfully delivered by Driver", doNum)
			notifType = "delivered"
		case domain.DOStatusCompleted:
			title = "DO Completed"
			msg = fmt.Sprintf("Delivery Order %s has been completed and verified", doNum)
			notifType = "completed"
		case domain.DOStatusReturned:
			title = "DO Returned"
			msg = fmt.Sprintf("Delivery Order %s has been returned by Driver", doNum)
			notifType = "warning"
		case domain.DOStatusCancelled:
			title = "DO Cancelled"
			msg = fmt.Sprintf("Delivery Order %s has been cancelled", doNum)
			notifType = "error"
		default:
			return
		}

		if title != "" {
			hub.BroadcastNotification(title, msg, notifType, map[string]interface{}{
				"do_number": doNum,
				"action":    "view_do",
			})
		}
	}(do.DONumber, req.Status)

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

func timeContains(s, substr string) bool {
	return strings.Contains(strings.ToLower(s), strings.ToLower(substr))
}
