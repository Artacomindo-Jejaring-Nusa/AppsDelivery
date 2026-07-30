package domain

import "context"

// DashboardStats represents aggregated system performance statistics.
type DashboardStats struct {
	TotalDeliveryOrders int64            `json:"total_delivery_orders"`
	TodayDeliveryOrders int64            `json:"today_delivery_orders"`
	MonthDeliveryOrders int64            `json:"month_delivery_orders"`
	DOStatusBreakdown   map[string]int64 `json:"do_status_breakdown"`
	SLABreakdown        map[string]int64 `json:"sla_breakdown"`
	ActiveManifests     int64            `json:"active_manifests"`
	TotalDismantleAssets int64            `json:"total_dismantle_assets"`
	ActiveDrivers        int64            `json:"active_drivers"`
}

// MonthlyTrendItem holds daily or periodic SLA trend metrics.
type MonthlyTrendItem struct {
	Label  string  `json:"label"`
	Total  int64   `json:"total"`
	OnTime int64   `json:"on_time"`
	Rate   float64 `json:"rate"`
}

// RegionalComplianceItem holds region-based SLA compliance metrics.
type RegionalComplianceItem struct {
	Region  string  `json:"region"`
	Total   int64   `json:"total"`
	Green   int64   `json:"green"`
	SLARate float64 `json:"sla_rate"`
}

// AnalyticsOverview represents full analytics data for the Analytics page.
type AnalyticsOverview struct {
	TotalShipments     int64                     `json:"total_shipments"`
	OnTimePercentage   float64                   `json:"on_time_percentage"`
	SLABreachRisk      int64                     `json:"sla_breach_risk"`
	SLABreached        int64                     `json:"sla_breached"`
	ActiveInbound      int64                     `json:"active_inbound"`
	AvgResolutionHours float64                   `json:"avg_resolution_hours"`
	SLAStatusBreakdown map[string]int64          `json:"sla_status_breakdown"`
	MonthlyTrend       []*MonthlyTrendItem       `json:"monthly_trend"`
	RegionalCompliance []*RegionalComplianceItem `json:"regional_compliance"`
}

// DashboardRepository defines the contract for dashboard analytics queries.
type DashboardRepository interface {
	GetStats(ctx context.Context) (*DashboardStats, error)
	GetAnalytics(ctx context.Context) (*AnalyticsOverview, error)
}

// DashboardUsecase defines the contract for dashboard business logic.
type DashboardUsecase interface {
	GetStats(ctx context.Context) (*DashboardStats, error)
	GetAnalytics(ctx context.Context) (*AnalyticsOverview, error)
}

