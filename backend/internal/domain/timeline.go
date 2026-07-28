package domain

import "context"

// RACIRole represents responsibility role in RACI matrix
type RACIRole string

const (
	RACIAccountable            RACIRole = "A"
	RACIResponsible            RACIRole = "R"
	RACIConsulted              RACIRole = "C"
	RACIInformed               RACIRole = "I"
	RACIAccountableResponsible RACIRole = "AR"
)

// TimelineActivity represents one of the 15 activities from RACI Matrix WBS
type TimelineActivity struct {
	No             int      `json:"no"`
	Activity       string   `json:"activity"`
	Phase          string   `json:"phase"` // e.g. "Preparation & Outbound", "Site & Dismantle", "Reverse Logistics", "Closing"
	KubikMadani    RACIRole `json:"kubik_madani"`
	AKS            RACIRole `json:"aks"`
	Artacomindo    RACIRole `json:"artacomindo"`
	Ericsson       RACIRole `json:"ericsson"`
	Deliverable    string   `json:"deliverable"`
	Status         string   `json:"status"` // "COMPLETED", "IN_PROGRESS", "PENDING"
	ProgressPct    int      `json:"progress_pct"`
	RequiredRole   string   `json:"required_role"`
}

// ProjectTimelineSummary represents total project milestone overview
type ProjectTimelineSummary struct {
	TotalActivities int                `json:"total_activities"`
	CompletedCount  int                `json:"completed_count"`
	InProgressCount int                `json:"in_progress_count"`
	PendingCount    int                `json:"pending_count"`
	OverallProgress int                `json:"overall_progress"`
	Activities      []TimelineActivity `json:"activities"`
}

// TimelineUsecase defines the contract for fetching timeline & RACI matrix
type TimelineUsecase interface {
	GetProjectTimeline(ctx context.Context) (*ProjectTimelineSummary, error)
}
