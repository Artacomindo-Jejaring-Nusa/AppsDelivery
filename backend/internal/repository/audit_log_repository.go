package repository

import (
	"context"
	"fmt"

	"backend-delivery/internal/domain"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type auditLogRepository struct {
	db *pgxpool.Pool
}

// NewAuditLogRepository creates a new audit log repository.
func NewAuditLogRepository(db *pgxpool.Pool) domain.AuditLogRepository {
	return &auditLogRepository{db: db}
}

func (r *auditLogRepository) Create(ctx context.Context, log *domain.AuditLog) error {
	if log.ID == uuid.Nil {
		log.ID = uuid.New()
	}

	query := `
		INSERT INTO audit_logs (id, user_id, action, entity_name, entity_id, ip_address, user_agent, details, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`

	_, err := r.db.Exec(ctx, query,
		log.ID,
		log.UserID,
		log.Action,
		log.EntityName,
		log.EntityID,
		log.IPAddress,
		log.UserAgent,
		log.Details,
	)
	return err
}

func (r *auditLogRepository) GetList(ctx context.Context, pagination *domain.PaginationRequest) ([]*domain.AuditLog, int64, error) {
	pagination.SetDefaults()

	countQuery := `SELECT COUNT(*) FROM audit_logs`
	var total int64
	if err := r.db.QueryRow(ctx, countQuery).Scan(&total); err != nil {
		return nil, 0, err
	}

	offset := (pagination.Page - 1) * pagination.PerPage
	dataQuery := fmt.Sprintf(`
		SELECT id, user_id, action, entity_name, entity_id, ip_address, user_agent, details, created_at
		FROM audit_logs
		ORDER BY created_at DESC
		LIMIT %d OFFSET %d`, pagination.PerPage, offset)

	rows, err := r.db.Query(ctx, dataQuery)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var logs []*domain.AuditLog
	for rows.Next() {
		log := &domain.AuditLog{}
		if err := rows.Scan(
			&log.ID,
			&log.UserID,
			&log.Action,
			&log.EntityName,
			&log.EntityID,
			&log.IPAddress,
			&log.UserAgent,
			&log.Details,
			&log.CreatedAt,
		); err != nil {
			return nil, 0, err
		}
		logs = append(logs, log)
	}

	return logs, total, nil
}
