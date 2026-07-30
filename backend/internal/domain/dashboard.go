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
	TotalDismantleAssets int64           `json:"total_dismantle_assets"`
	ActiveDrivers       int64            `json:"active_drivers"`
}

// DashboardRepository defines the contract for dashboard analytics queries.
type DashboardRepository interface {
	GetStats(ctx context.Context) (*DashboardStats, error)
}

// DashboardUsecase defines the contract for dashboard business logic.
type DashboardUsecase interface {
	GetStats(ctx context.Context) (*DashboardStats, error)
}
