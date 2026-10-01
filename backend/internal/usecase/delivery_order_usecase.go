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
	btsRepo  domain.BtsSiteRepository
	slaHours int
}

// NewDeliveryOrderUsecase creates a new DeliveryOrderUsecase implementation.
func NewDeliveryOrderUsecase(doRepo domain.DeliveryOrderRepository, btsRepo domain.BtsSiteRepository, slaDefaultHours int) domain.DeliveryOrderUsecase {
	return &deliveryOrderUsecase{
		doRepo:   doRepo,
		btsRepo:  btsRepo,
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

	var btsSiteUUID *uuid.UUID
	if req.BtsSiteID != "" {
		if parsed, err := uuid.Parse(req.BtsSiteID); err == nil {
			btsSiteUUID = &parsed
		} else if u.btsRepo != nil {
			if site, err := u.btsRepo.FindBySiteID(ctx, req.BtsSiteID); err == nil && site != nil {
				btsSiteUUID = &site.ID
			}
		}
	}

	deliveryType := req.Type
	if deliveryType != domain.DeliveryTypeInbound && deliveryType != domain.DeliveryTypeOutbound {
		// Auto-detect based on destination address or notes
		dest := req.DestinationAddress
		if btsSiteUUID == nil || (dest != "" && (timeContains(dest, "gudang") || timeContains(dest, "ericsson"))) {
			deliveryType = domain.DeliveryTypeOutbound
		} else {
			deliveryType = domain.DeliveryTypeInbound
		}
	}

	do := &domain.DeliveryOrder{
		ID:                 uuid.New(),
		DONumber:           req.DONumber,
		BtsSiteID:          btsSiteUUID,
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
	populateDurationInfo(do)
	return do, nil
}

func (u *deliveryOrderUsecase) BulkCreate(ctx context.Context, req *domain.BulkCreateDeliveryOrderRequest, createdBy uuid.UUID) ([]*domain.DeliveryOrder, error) {
	if len(req.Orders) == 0 {
		return nil, errors.New("tidak ada data DO yang dikirim untuk import")
	}
	if len(req.Orders) > 10 {
		return nil, errors.New("maksimal 10 Delivery Order per sekali import Excel")
	}

	createdOrders := make([]*domain.DeliveryOrder, 0, len(req.Orders))
	for i, orderReq := range req.Orders {
		if orderReq.DONumber == "" {
			return nil, fmt.Errorf("baris ke-%d: No DO wajib diisi", i+1)
		}
		created, err := u.Create(ctx, &orderReq, createdBy)
		if err != nil {
			return nil, fmt.Errorf("gagal membuat DO No. %s (baris %d): %w", orderReq.DONumber, i+1, err)
		}
		createdOrders = append(createdOrders, created)
	}

	return createdOrders, nil
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
	populateDurationInfo(do)
	return do, nil
}

func (u *deliveryOrderUsecase) GetAll(ctx context.Context, filter *domain.DOFilterRequest) ([]*domain.DeliveryOrder, int64, error) {
	dos, total, err := u.doRepo.FindAll(ctx, filter)
	if err != nil {
		return nil, 0, err
	}
	for _, do := range dos {
		populateSLADetail(do)
		populateDurationInfo(do)
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

	now := time.Now()
	switch req.Status {
	case domain.DOStatusAssigned:
		do.AssignedAt = &now
	case domain.DOStatusInTransit:
		do.InTransitAt = &now
	case domain.DOStatusDelivered:
		do.DeliveredAt = &now
	case domain.DOStatusCompleted:
		do.CompletedAt = &now
	case domain.DOStatusReturned:
		do.ReturnedAt = &now
	case domain.DOStatusCancelled:
		do.CancelledAt = &now
	}

	do.Status = req.Status
	populateSLADetail(do)
	populateDurationInfo(do)

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

// BatchUpdateStatus updates multiple DOs' status in batch.
func (u *deliveryOrderUsecase) BatchUpdateStatus(ctx context.Context, req *domain.BatchUpdateStatusRequest) ([]*domain.DeliveryOrder, []error) {
	if len(req.IDs) == 0 {
		return nil, []error{errors.New("tidak ada DO yang dipilih")}
	}

	var updated []*domain.DeliveryOrder
	var errs []error

	for _, id := range req.IDs {
		do, err := u.UpdateStatus(ctx, id, &domain.UpdateDOStatusRequest{
			Status: req.Status,
			Notes:  req.Notes,
		})
		if err != nil {
			errs = append(errs, fmt.Errorf("DO %s: %w", id.String()[:8], err))
		} else {
			updated = append(updated, do)
		}
	}

	return updated, errs
}

// isValidStatusTransition validates allowed status transitions.
func isValidStatusTransition(current, target string) bool {
	transitions := map[string][]string{
		domain.DOStatusPending:   {domain.DOStatusAssigned, domain.DOStatusCancelled},
		domain.DOStatusAssigned:  {domain.DOStatusInTransit, domain.DOStatusCancelled},
		domain.DOStatusInTransit: {domain.DOStatusDelivered, domain.DOStatusReturned, domain.DOStatusCancelled, domain.DOStatusCompleted},
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

// populateDurationInfo calculates durations between timeline steps.
func populateDurationInfo(do *domain.DeliveryOrder) {
	if do == nil {
		return
	}

	info := &domain.DurationInfoResponse{}
	hasAny := false

	// Pending -> Assigned
	if do.AssignedAt != nil {
		d := do.AssignedAt.Sub(do.CreatedAt)
		info.PendingToAssigned = formatDuration(d)
		hasAny = true
	}

	// Assigned -> In Transit
	if do.AssignedAt != nil && do.InTransitAt != nil {
		d := do.InTransitAt.Sub(*do.AssignedAt)
		info.AssignedToInTransit = formatDuration(d)
		hasAny = true
	}

	// In Transit -> Delivered
	if do.InTransitAt != nil && do.DeliveredAt != nil {
		d := do.DeliveredAt.Sub(*do.InTransitAt)
		info.InTransitToDelivered = formatDuration(d)
		hasAny = true
	}

	// Delivered -> Completed
	if do.DeliveredAt != nil && do.CompletedAt != nil {
		d := do.CompletedAt.Sub(*do.DeliveredAt)
		info.DeliveredToCompleted = formatDuration(d)
		hasAny = true
	}

	// Total Duration
	var endPoint *time.Time
	if do.CompletedAt != nil {
		endPoint = do.CompletedAt
	} else if do.DeliveredAt != nil {
		endPoint = do.DeliveredAt
	}

	if endPoint != nil {
		d := endPoint.Sub(do.CreatedAt)
		info.TotalDuration = formatDuration(d)
		hasAny = true
	} else if do.Status == domain.DOStatusInTransit || do.Status == domain.DOStatusAssigned {
		d := time.Since(do.CreatedAt)
		info.TotalDuration = formatDuration(d) + " (berjalan)"
		hasAny = true
	}

	if hasAny {
		do.DurationInfo = info
	}
}

func formatDuration(d time.Duration) string {
	if d < 0 {
		d = 0
	}
	days := int(d.Hours()) / 24
	hours := int(d.Hours()) % 24
	minutes := int(d.Minutes()) % 60

	if days > 0 {
		if hours > 0 {
			return fmt.Sprintf("%d hr %d jam", days, hours)
		}
		return fmt.Sprintf("%d hr", days)
	}
	if hours > 0 {
		if minutes > 0 {
			return fmt.Sprintf("%d jam %d mnt", hours, minutes)
		}
		return fmt.Sprintf("%d jam", hours)
	}
	if minutes > 0 {
		return fmt.Sprintf("%d mnt", minutes)
	}
	return "< 1 mnt"
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

	// SLA calculation stops when DO is completed, delivered, returned, or cancelled
	if do.Status == domain.DOStatusCompleted || do.Status == domain.DOStatusDelivered || do.Status == domain.DOStatusReturned || do.Status == domain.DOStatusCancelled {
		do.SLADetail = &domain.SLADetailResponse{
			TargetDays:         targetDays,
			TargetText:         fmt.Sprintf("%d Hari", targetDays),
			RemainingDays:      0,
			RemainingHours:     0,
			RemainingFormatted: "✅ SLA Selesai",
			IsOverdue:          false,
		}
		return
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
