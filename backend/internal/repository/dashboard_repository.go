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

	// 6. Active Drivers Count
	driverQuery := `SELECT COUNT(*) FROM drivers WHERE is_active = true`
	_ = r.db.QueryRow(ctx, driverQuery).Scan(&stats.ActiveDrivers)

	return stats, nil
}

func (r *dashboardRepository) GetAnalytics(ctx context.Context) (*domain.AnalyticsOverview, error) {
	overview := &domain.AnalyticsOverview{
		SLAStatusBreakdown: make(map[string]int64),
		MonthlyTrend:       make([]*domain.MonthlyTrendItem, 0),
		RegionalCompliance: make([]*domain.RegionalComplianceItem, 0),
	}

	// 1. Overall counts
	queryCounts := `
		SELECT
			COUNT(*) AS total_shipments,
			COUNT(*) FILTER (WHERE sla_status = 'green') AS green_count,
			COUNT(*) FILTER (WHERE sla_status = 'yellow') AS yellow_count,
			COUNT(*) FILTER (WHERE sla_status = 'red') AS red_count,
			COUNT(*) FILTER (WHERE status IN ('assigned', 'in_transit')) AS active_inbound,
			COALESCE(AVG(EXTRACT(EPOCH FROM (updated_at - created_at))/3600) FILTER (WHERE status = 'completed'), 4.2) AS avg_res_hours
		FROM delivery_orders
		WHERE deleted_at IS NULL`

	var greenCount, yellowCount, redCount int64
	err := r.db.QueryRow(ctx, queryCounts).Scan(
		&overview.TotalShipments,
		&greenCount,
		&yellowCount,
		&redCount,
		&overview.ActiveInbound,
		&overview.AvgResolutionHours,
	)
	if err != nil {
		return nil, err
	}

	overview.SLABreachRisk = yellowCount
	overview.SLABreached = redCount
	overview.SLAStatusBreakdown["green"] = greenCount
	overview.SLAStatusBreakdown["yellow"] = yellowCount
	overview.SLAStatusBreakdown["red"] = redCount

	if overview.TotalShipments > 0 {
		overview.OnTimePercentage = float64(greenCount) / float64(overview.TotalShipments) * 100
	} else {
		overview.OnTimePercentage = 100.0
	}

	// 2. Trend data (grouped by date)
	queryTrend := `
		SELECT
			TO_CHAR(DATE_TRUNC('day', created_at), 'Mon DD') AS label,
			COUNT(*) AS total,
			COUNT(*) FILTER (WHERE sla_status = 'green') AS on_time
		FROM delivery_orders
		WHERE deleted_at IS NULL
		GROUP BY DATE_TRUNC('day', created_at), label
		ORDER BY MIN(created_at) ASC
		LIMIT 12`

	trendRows, err := r.db.Query(ctx, queryTrend)
	if err == nil {
		defer trendRows.Close()
		for trendRows.Next() {
			item := &domain.MonthlyTrendItem{}
			if err := trendRows.Scan(&item.Label, &item.Total, &item.OnTime); err == nil {
				if item.Total > 0 {
					item.Rate = float64(item.OnTime) / float64(item.Total) * 100
				}
				overview.MonthlyTrend = append(overview.MonthlyTrend, item)
			}
		}
	}

	// 3. Regional Compliance
	queryRegion := `
		SELECT
			COALESCE(NULLIF(b.province, ''), COALESCE(NULLIF(b.city, ''), 'Wilayah Utama')) AS region,
			COUNT(*) AS total,
			COUNT(*) FILTER (WHERE d.sla_status = 'green') AS green_count
		FROM delivery_orders d
		LEFT JOIN bts_sites b ON d.bts_site_id = b.id
		WHERE d.deleted_at IS NULL
		GROUP BY region
		ORDER BY total DESC
		LIMIT 5`

	regRows, err := r.db.Query(ctx, queryRegion)
	if err == nil {
		defer regRows.Close()
		for regRows.Next() {
			item := &domain.RegionalComplianceItem{}
			if err := regRows.Scan(&item.Region, &item.Total, &item.Green); err == nil {
				if item.Total > 0 {
					item.SLARate = float64(item.Green) / float64(item.Total) * 100
				}
				overview.RegionalCompliance = append(overview.RegionalCompliance, item)
			}
		}
	}

	return overview, nil
}

