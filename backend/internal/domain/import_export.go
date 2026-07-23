package domain

import (
	"context"
	"io"

	"github.com/google/uuid"
)

// ImportResult represents summary response after CSV/Excel import.
type ImportResult struct {
	TotalRows int      `json:"total_rows"`
	Success   int      `json:"success"`
	Skipped   int      `json:"skipped"`
	Errors    []string `json:"errors,omitempty"`
}

// ImportExportUsecase defines contracts for bulk CSV/Excel import and report exports.
type ImportExportUsecase interface {
	ImportBtsSites(ctx context.Context, reader io.Reader, filename string) (*ImportResult, error)
	ImportDeliveryOrders(ctx context.Context, reader io.Reader, filename string, createdBy uuid.UUID) (*ImportResult, error)
	ExportDeliveryOrders(ctx context.Context) ([]byte, string, error)
	ExportDismantleAssets(ctx context.Context) ([]byte, string, error)
}
