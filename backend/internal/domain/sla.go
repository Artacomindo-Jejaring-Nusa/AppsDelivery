package domain

import (
	"context"
	"time"

	"github.com/google/uuid"
)

// SLALog records each SLA status change for a delivery order.
type SLALog struct {
	ID              uuid.UUID  `json:"id"`
	DeliveryOrderID uuid.UUID  `json:"delivery_order_id"`
	DONumber        string     `json:"do_number,omitempty"`
	PreviousStatus  *string    `json:"previous_status"`
	NewStatus       string     `json:"new_status"`
	RemainingHours  *float64   `json:"remaining_hours"`
	Message         string     `json:"message"`
	CreatedAt       time.Time  `json:"created_at"`
}


// SLASummary holds the aggregated SLA overview counts.
type SLASummary struct {
	TotalOrders  int64 `json:"total_orders"`
	GreenCount   int64 `json:"green_count"`
	YellowCount  int64 `json:"yellow_count"`
	RedCount     int64 `json:"red_count"`
}

// ---- Repository Interface ----

// SLARepository defines the contract for SLA log data access.
type SLARepository interface {
	CreateLog(ctx context.Context, log *SLALog) error
	FindLogsByDOID(ctx context.Context, doID uuid.UUID) ([]*SLALog, error)
	FindAllLogs(ctx context.Context, pagination *PaginationRequest) ([]*SLALog, int64, error)
	GetSummary(ctx context.Context) (*SLASummary, error)
}

// ---- Usecase Interface ----

// SLAEngineUsecase defines the contract for the SLA evaluation engine.
type SLAEngineUsecase interface {
	EvaluateAll(ctx context.Context) error
	GetSummary(ctx context.Context) (*SLASummary, error)
	GetLogs(ctx context.Context, pagination *PaginationRequest) ([]*SLALog, int64, error)
}
