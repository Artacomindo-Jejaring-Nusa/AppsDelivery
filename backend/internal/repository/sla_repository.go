package repository

import (
	"context"
	"fmt"

	"backend-delivery/internal/domain"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type slaRepository struct {
	db *pgxpool.Pool
}

// NewSLARepository creates a new SLARepository implementation.
func NewSLARepository(db *pgxpool.Pool) domain.SLARepository {
	return &slaRepository{db: db}
}

func (r *slaRepository) CreateLog(ctx context.Context, log *domain.SLALog) error {
	query := `
		INSERT INTO sla_logs (id, delivery_order_id, previous_status, new_status, remaining_hours, message)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING created_at`

	if log.ID == uuid.Nil {
		log.ID = uuid.New()
	}

	return r.db.QueryRow(ctx, query,
		log.ID, log.DeliveryOrderID, log.PreviousStatus,
		log.NewStatus, log.RemainingHours, log.Message,
	).Scan(&log.CreatedAt)
}

func (r *slaRepository) FindLogsByDOID(ctx context.Context, doID uuid.UUID) ([]*domain.SLALog, error) {
	query := `
		SELECT id, delivery_order_id, previous_status, new_status, remaining_hours, message, created_at
		FROM sla_logs WHERE delivery_order_id = $1
		ORDER BY created_at DESC`

	rows, err := r.db.Query(ctx, query, doID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var logs []*domain.SLALog
	for rows.Next() {
		log := &domain.SLALog{}
		if err := rows.Scan(
			&log.ID, &log.DeliveryOrderID, &log.PreviousStatus,
			&log.NewStatus, &log.RemainingHours, &log.Message, &log.CreatedAt,
		); err != nil {
			return nil, err
		}
		logs = append(logs, log)
	}

	return logs, nil
}

func (r *slaRepository) FindAllLogs(ctx context.Context, pagination *domain.PaginationRequest) ([]*domain.SLALog, int64, error) {
	pagination.SetDefaults()

	var total int64
	if err := r.db.QueryRow(ctx, `SELECT COUNT(*) FROM sla_logs`).Scan(&total); err != nil {
		return nil, 0, err
	}

	query := fmt.Sprintf(`
		SELECT id, delivery_order_id, previous_status, new_status, remaining_hours, message, created_at
		FROM sla_logs
		ORDER BY created_at DESC
		LIMIT $1 OFFSET $2`)

	rows, err := r.db.Query(ctx, query, pagination.PerPage, pagination.Offset())
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var logs []*domain.SLALog
	for rows.Next() {
		log := &domain.SLALog{}
		if err := rows.Scan(
			&log.ID, &log.DeliveryOrderID, &log.PreviousStatus,
			&log.NewStatus, &log.RemainingHours, &log.Message, &log.CreatedAt,
		); err != nil {
			return nil, 0, err
		}
		logs = append(logs, log)
	}

	return logs, total, nil
}

func (r *slaRepository) GetSummary(ctx context.Context) (*domain.SLASummary, error) {
	query := `
		SELECT
			COUNT(*) AS total_orders,
			COUNT(*) FILTER (WHERE sla_status = 'green') AS green_count,
			COUNT(*) FILTER (WHERE sla_status = 'yellow') AS yellow_count,
			COUNT(*) FILTER (WHERE sla_status = 'red') AS red_count
		FROM delivery_orders
		WHERE deleted_at IS NULL AND status NOT IN ('completed', 'cancelled')`

	summary := &domain.SLASummary{}
	err := r.db.QueryRow(ctx, query).Scan(
		&summary.TotalOrders, &summary.GreenCount,
		&summary.YellowCount, &summary.RedCount,
	)
	if err != nil {
		return nil, err
	}
	return summary, nil
}
