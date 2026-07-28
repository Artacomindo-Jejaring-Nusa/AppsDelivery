package domain

import (
	"context"
	"time"

	"github.com/google/uuid"
)

// AuditLog represents a single security audit event in the system.
type AuditLog struct {
	ID         uuid.UUID  `json:"id"`
	UserID     *uuid.UUID `json:"user_id,omitempty"`
	Action     string     `json:"action"`
	EntityName string     `json:"entity_name"`
	EntityID   string     `json:"entity_id,omitempty"`
	IPAddress  string     `json:"ip_address"`
	UserAgent  string     `json:"user_agent,omitempty"`
	Details    string     `json:"details,omitempty"`
	CreatedAt  time.Time  `json:"created_at"`
}

// AuditLogRepository defines DB operations for audit logs.
type AuditLogRepository interface {
	Create(ctx context.Context, log *AuditLog) error
	GetList(ctx context.Context, pagination *PaginationRequest) ([]*AuditLog, int64, error)
}
