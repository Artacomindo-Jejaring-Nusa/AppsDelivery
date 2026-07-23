package domain

// PaginationRequest holds pagination parameters from the client.
type PaginationRequest struct {
	Page    int    `form:"page" json:"page"`
	PerPage int    `form:"per_page" json:"per_page"`
	Search  string `form:"search" json:"search"`
	SortBy  string `form:"sort_by" json:"sort_by"`
	Order   string `form:"order" json:"order"` // "asc" or "desc"
}

// SetDefaults applies default values if not provided.
func (p *PaginationRequest) SetDefaults() {
	if p.Page <= 0 {
		p.Page = 1
	}
	if p.PerPage <= 0 {
		p.PerPage = 20
	}
	if p.PerPage > 100 {
		p.PerPage = 100
	}
	if p.Order == "" {
		p.Order = "desc"
	}
	if p.SortBy == "" {
		p.SortBy = "created_at"
	}
}

// Offset calculates the SQL offset from the page and per_page values.
func (p *PaginationRequest) Offset() int {
	return (p.Page - 1) * p.PerPage
}

// ---- Role Constants ----

const (
	RoleAdmin      = "admin"
	RoleDispatcher = "dispatcher"
	RoleDriver     = "driver"
	RoleDataEntry  = "data_entry"
)

// ---- Delivery Order Status Constants ----

const (
	DOStatusPending   = "pending"
	DOStatusAssigned  = "assigned"
	DOStatusInTransit = "in_transit"
	DOStatusDelivered = "delivered"
	DOStatusReturned  = "returned"
	DOStatusCompleted = "completed"
	DOStatusCancelled = "cancelled"
)

// ---- Manifest Status Constants ----

const (
	ManifestStatusDraft      = "draft"
	ManifestStatusDispatched = "dispatched"
	ManifestStatusInTransit  = "in_transit"
	ManifestStatusCompleted  = "completed"
	ManifestStatusCancelled  = "cancelled"
)

// ---- SLA Status Constants ----

const (
	SLAStatusGreen  = "green"
	SLAStatusYellow = "yellow"
	SLAStatusRed    = "red"
)
