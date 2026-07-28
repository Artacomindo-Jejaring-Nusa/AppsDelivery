package middleware

import (
	"context"
	"fmt"
	"net/http"
	"strings"

	"backend-delivery/internal/domain"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// AuditLogger returns a middleware that records mutating HTTP requests into audit_logs table.
func AuditLogger(auditRepo domain.AuditLogRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		method := c.Request.Method

		// Only log mutating requests (POST, PUT, PATCH, DELETE)
		if method == http.MethodGet || method == http.MethodHead || method == http.MethodOptions {
			c.Next()
			return
		}

		c.Next()

		// Execute audit record if status code indicates success or client action (2xx, 4xx)
		if c.Writer.Status() < 500 {
			var userID *uuid.UUID
			if uidVal, exists := c.Get("user_id"); exists {
				if uid, ok := uidVal.(uuid.UUID); ok {
					userID = &uid
				}
			}

			path := c.Request.URL.Path
			parts := strings.Split(strings.Trim(path, "/"), "/")

			entityName := "system"
			if len(parts) >= 3 { // e.g. api/v1/delivery-orders
				entityName = parts[2]
			}

			entityID := ""
			if len(parts) >= 4 {
				entityID = parts[3]
			}

			action := fmt.Sprintf("%s %s", method, path)
			ip := c.ClientIP()
			userAgent := c.Request.UserAgent()
			details := fmt.Sprintf("Status: %d", c.Writer.Status())

			auditEntry := &domain.AuditLog{
				ID:         uuid.New(),
				UserID:     userID,
				Action:     action,
				EntityName: entityName,
				EntityID:   entityID,
				IPAddress:  ip,
				UserAgent:  userAgent,
				Details:    details,
			}

			// Save log asynchronously via background context
			go func(entry *domain.AuditLog) {
				_ = auditRepo.Create(context.Background(), entry)
			}(auditEntry)
		}
	}
}
