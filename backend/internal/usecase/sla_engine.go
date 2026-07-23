package usecase

import (
	"context"
	"fmt"
	"log"
	"math"
	"time"

	"backend-delivery/internal/domain"

	"github.com/google/uuid"
)

type slaEngineUsecase struct {
	doRepo      domain.DeliveryOrderRepository
	slaRepo     domain.SLARepository
	warningHours int
}

// NewSLAEngineUsecase creates a new SLAEngineUsecase implementation.
func NewSLAEngineUsecase(doRepo domain.DeliveryOrderRepository, slaRepo domain.SLARepository, warningHours int) domain.SLAEngineUsecase {
	return &slaEngineUsecase{
		doRepo:      doRepo,
		slaRepo:     slaRepo,
		warningHours: warningHours,
	}
}

// EvaluateAll checks all active DOs and updates their SLA status.
func (u *slaEngineUsecase) EvaluateAll(ctx context.Context) error {
	orders, err := u.doRepo.FindPendingForSLA(ctx)
	if err != nil {
		return fmt.Errorf("SLA Engine: failed to fetch pending orders: %w", err)
	}

	now := time.Now()
	for _, do := range orders {
		if do.SLADeadline == nil {
			continue
		}

		remainingHours := do.SLADeadline.Sub(now).Hours()
		remainingRounded := math.Round(remainingHours*100) / 100

		var newStatus string
		var message string

		if remainingHours <= 0 {
			// SLA breached
			newStatus = domain.SLAStatusRed
			message = fmt.Sprintf("SLA breached! Overdue by %.1f hours", math.Abs(remainingHours))
		} else if remainingHours <= float64(u.warningHours) {
			// SLA warning
			newStatus = domain.SLAStatusYellow
			message = fmt.Sprintf("SLA warning: %.1f hours remaining", remainingHours)
		} else {
			// SLA on track
			newStatus = domain.SLAStatusGreen
			message = fmt.Sprintf("SLA on track: %.1f hours remaining", remainingHours)
		}

		// Only log and update if status changed
		if newStatus != do.SLAStatus {
			log.Printf("[SLA Engine] DO %s: %s -> %s (%s)", do.DONumber, do.SLAStatus, newStatus, message)

			// Update SLA status in DB
			if err := u.doRepo.UpdateSLAStatus(ctx, do.ID, newStatus); err != nil {
				log.Printf("[SLA Engine] Failed to update status for DO %s: %v", do.DONumber, err)
				continue
			}

			// Create SLA log
			prevStatus := do.SLAStatus
			slaLog := &domain.SLALog{
				ID:              uuid.New(),
				DeliveryOrderID: do.ID,
				PreviousStatus:  &prevStatus,
				NewStatus:       newStatus,
				RemainingHours:  &remainingRounded,
				Message:         message,
			}
			if err := u.slaRepo.CreateLog(ctx, slaLog); err != nil {
				log.Printf("[SLA Engine] Failed to create log for DO %s: %v", do.DONumber, err)
			}
		}
	}

	log.Printf("[SLA Engine] Evaluation complete. Checked %d orders.", len(orders))
	return nil
}

func (u *slaEngineUsecase) GetSummary(ctx context.Context) (*domain.SLASummary, error) {
	return u.slaRepo.GetSummary(ctx)
}

func (u *slaEngineUsecase) GetLogs(ctx context.Context, pagination *domain.PaginationRequest) ([]*domain.SLALog, int64, error) {
	return u.slaRepo.FindAllLogs(ctx, pagination)
}
