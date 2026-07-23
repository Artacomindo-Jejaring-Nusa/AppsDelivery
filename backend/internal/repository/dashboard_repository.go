package repository

import (
	"context"

	"backend-delivery/internal/domain"

	"github.com/jackc/pgx/v5/pgxpool"
)

type dashboardRepository struct {
	db *pgxpool.Pool
}

// NewDashboardRepository creates a new DashboardRepository implementation.
func NewDashboardRepository(db *pgxpool.Pool) domain.DashboardRepository {
	return &dashboardRepository{db: db}
}

func (r *dashboardRepository) GetStats(ctx context.Context) (*domain.DashboardStats, error) {
	stats := &domain.DashboardStats{
		DOStatusBreakdown: make(map[string]int64),
		SLABreakdown:      make(map[string]int64),
	}

	// 1. Total, Today, Month DO Counts
	countQuery := `
		SELECT
			COUNT(*),
			COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE),
			COUNT(*) FILTER (WHERE created_at >= date_trunc('month', CURRENT_DATE))
		FROM delivery_orders WHERE deleted_at IS NULL`

	err := r.db.QueryRow(ctx, countQuery).Scan(
		&stats.TotalDeliveryOrders,
		&stats.TodayDeliveryOrders,
		&stats.MonthDeliveryOrders,
	)
	if err != nil {
		return nil, err
	}

	// 2. DO Status Breakdown
	statusQuery := `
		SELECT status, COUNT(*)
		FROM delivery_orders
		WHERE deleted_at IS NULL
		GROUP BY status`

	statusRows, err := r.db.Query(ctx, statusQuery)
	if err != nil {
		return nil, err
	}
	defer statusRows.Close()

	for statusRows.Next() {
		var status string
		var count int64
		if err := statusRows.Scan(&status, &count); err == nil {
			stats.DOStatusBreakdown[status] = count
		}
	}

	// Ensure default status keys exist
	statuses := []string{domain.DOStatusPending, domain.DOStatusAssigned, domain.DOStatusInTransit, domain.DOStatusDelivered, domain.DOStatusCompleted, domain.DOStatusCancelled}
	for _, s := range statuses {
		if _, exists := stats.DOStatusBreakdown[s]; !exists {
			stats.DOStatusBreakdown[s] = 0
		}
	}

	// 3. SLA Breakdown
	slaQuery := `
		SELECT sla_status, COUNT(*)
		FROM delivery_orders
		WHERE deleted_at IS NULL AND status NOT IN ('completed', 'cancelled')
		GROUP BY sla_status`

	slaRows, err := r.db.Query(ctx, slaQuery)
	if err != nil {
		return nil, err
	}
	defer slaRows.Close()

	for slaRows.Next() {
		var slaStatus string
		var count int64
		if err := slaRows.Scan(&slaStatus, &count); err == nil {
			stats.SLABreakdown[slaStatus] = count
		}
	}

	for _, s := range []string{domain.SLAStatusGreen, domain.SLAStatusYellow, domain.SLAStatusRed} {
		if _, exists := stats.SLABreakdown[s]; !exists {
			stats.SLABreakdown[s] = 0
		}
	}

	// 4. Active Manifests Count
	manifestQuery := `SELECT COUNT(*) FROM manifests WHERE status IN ('draft', 'dispatched', 'in_transit')`
	_ = r.db.QueryRow(ctx, manifestQuery).Scan(&stats.ActiveManifests)

	// 5. Total Dismantle Assets
	assetQuery := `SELECT COUNT(*) FROM dismantle_assets`
	_ = r.db.QueryRow(ctx, assetQuery).Scan(&stats.TotalDismantleAssets)

	return stats, nil
}
