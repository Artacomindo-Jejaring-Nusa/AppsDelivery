package handler

import (
	"net/http"

	"backend-delivery/internal/domain"
	"backend-delivery/pkg/response"

	"github.com/gin-gonic/gin"
)

type TimelineHandler struct {
	doRepo     domain.DeliveryOrderRepository
	manifestRepo domain.ManifestRepository
	assetRepo  domain.DismantleAssetRepository
	siteRepo   domain.BtsSiteRepository
}

func NewTimelineHandler(
	doRepo domain.DeliveryOrderRepository,
	manifestRepo domain.ManifestRepository,
	assetRepo domain.DismantleAssetRepository,
	siteRepo domain.BtsSiteRepository,
) *TimelineHandler {
	return &TimelineHandler{
		doRepo:       doRepo,
		manifestRepo: manifestRepo,
		assetRepo:    assetRepo,
		siteRepo:     siteRepo,
	}
}

// GetTimeline handles GET /api/v1/projects/timeline
func (h *TimelineHandler) GetTimeline(c *gin.Context) {
	ctx := c.Request.Context()

	// Get counts from repositories using FindAll
	p := &domain.PaginationRequest{Page: 1, PerPage: 1}
	_, totalDOs, _ := h.doRepo.FindAll(ctx, &domain.DOFilterRequest{PaginationRequest: *p})
	_, totalManifests, _ := h.manifestRepo.FindAll(ctx, p)
	_, totalSites, _ := h.siteRepo.FindAll(ctx, p)

	// Determine activity completion status dynamically
	act4Status := "PENDING"
	act4Pct := 0
	if totalManifests > 0 {
		act4Status = "COMPLETED"
		act4Pct = 100
	}

	act5Status := "PENDING"
	act5Pct := 0
	if totalDOs > 0 {
		act5Status = "COMPLETED"
		act5Pct = 100
	}

	act6Status := "PENDING"
	act6Pct := 0
	if totalDOs > 0 {
		act6Status = "IN_PROGRESS"
		act6Pct = 75
	}

	act11Status := "PENDING"
	act11Pct := 0
	if totalDOs > 0 {
		act11Status = "IN_PROGRESS"
		act11Pct = 60
	}

	activities := []domain.TimelineActivity{
		{No: 1, Activity: "Kick Off Project", Phase: "Persiapan & Alignment", KubikMadani: domain.RACIAccountable, AKS: domain.RACIInformed, Artacomindo: domain.RACIConsulted, Ericsson: domain.RACIConsulted, Deliverable: "Project Charter", Status: "COMPLETED", ProgressPct: 100},
		{No: 2, Activity: "Menyusun Project Schedule", Phase: "Persiapan & Alignment", KubikMadani: domain.RACIAccountable, AKS: domain.RACIConsulted, Artacomindo: domain.RACIConsulted, Ericsson: domain.RACIConsulted, Deliverable: "Baseline Schedule", Status: "COMPLETED", ProgressPct: 100},
		{No: 3, Activity: "Verifikasi BoM & Material", Phase: "Persiapan & Alignment", KubikMadani: domain.RACIAccountable, AKS: domain.RACIConsulted, Artacomindo: domain.RACIConsulted, Ericsson: domain.RACIConsulted, Deliverable: "Approved BoM", Status: "COMPLETED", ProgressPct: 100},
		{No: 4, Activity: "Alokasi Team Delivery", Phase: "Outbound Logistics", KubikMadani: domain.RACIInformed, AKS: domain.RACIAccountableResponsible, Artacomindo: domain.RACIAccountable, Ericsson: domain.RACIInformed, Deliverable: "List Team & Driver", Status: act4Status, ProgressPct: act4Pct},
		{No: 5, Activity: "Surat Jalan dan Detail Material Pengiriman", Phase: "Outbound Logistics", KubikMadani: domain.RACIAccountable, AKS: domain.RACIAccountableResponsible, Artacomindo: domain.RACIAccountable, Ericsson: domain.RACIInformed, Deliverable: "Detail Alamat & Material (DO)", Status: act5Status, ProgressPct: act5Pct},
		{No: 6, Activity: "Pick Up Material Warehouse", Phase: "Outbound Logistics", KubikMadani: domain.RACIInformed, AKS: domain.RACIAccountableResponsible, Artacomindo: domain.RACIAccountable, Ericsson: domain.RACIInformed, Deliverable: "Material Picking List", Status: act6Status, ProgressPct: act6Pct},
		{No: 7, Activity: "Pengiriman Material ke Site", Phase: "Outbound Logistics", KubikMadani: domain.RACIInformed, AKS: domain.RACIAccountableResponsible, Artacomindo: domain.RACIAccountable, Ericsson: domain.RACIInformed, Deliverable: "Delivery Note & GPS Tracking", Status: "IN_PROGRESS", ProgressPct: 80},
		{No: 8, Activity: "Penerimaan Material di Site", Phase: "Site Execution", KubikMadani: domain.RACIAccountableResponsible, AKS: domain.RACIInformed, Artacomindo: domain.RACIAccountable, Ericsson: domain.RACIInformed, Deliverable: "Site Receiving Note", Status: "IN_PROGRESS", ProgressPct: 70},
		{No: 9, Activity: "Dismantle ZTE", Phase: "Site Execution", KubikMadani: domain.RACIAccountableResponsible, AKS: domain.RACIInformed, Artacomindo: domain.RACIInformed, Ericsson: domain.RACIInformed, Deliverable: "Material Picking List Dismantle", Status: "IN_PROGRESS", ProgressPct: 65},
		{No: 10, Activity: "Alokasi Team Delivery (Return)", Phase: "Reverse Logistics", KubikMadani: domain.RACIInformed, AKS: domain.RACIAccountableResponsible, Artacomindo: domain.RACIAccountable, Ericsson: domain.RACIInformed, Deliverable: "List Team Return", Status: act4Status, ProgressPct: act4Pct},
		{No: 11, Activity: "Packing Perangkat Dismantle & QR Scan", Phase: "Reverse Logistics", KubikMadani: domain.RACIInformed, AKS: domain.RACIAccountableResponsible, Artacomindo: domain.RACIAccountable, Ericsson: domain.RACIInformed, Deliverable: "Packing & QR Code Label", Status: act11Status, ProgressPct: act11Pct},
		{No: 12, Activity: "Surat Jalan Return & Detail Material", Phase: "Reverse Logistics", KubikMadani: domain.RACIAccountable, AKS: domain.RACIAccountableResponsible, Artacomindo: domain.RACIAccountable, Ericsson: domain.RACIInformed, Deliverable: "Detail Alamat & Return Note", Status: act5Status, ProgressPct: act5Pct},
		{No: 13, Activity: "Return Material to Warehouse", Phase: "Reverse Logistics", KubikMadani: domain.RACIInformed, AKS: domain.RACIAccountableResponsible, Artacomindo: domain.RACIAccountable, Ericsson: domain.RACIInformed, Deliverable: "Return Note Log", Status: "IN_PROGRESS", ProgressPct: 50},
		{No: 14, Activity: "Serah Terima Material di Warehouse Ericsson", Phase: "Handover & Closing", KubikMadani: domain.RACIAccountableResponsible, AKS: domain.RACIAccountableResponsible, Artacomindo: domain.RACIAccountable, Ericsson: domain.RACIInformed, Deliverable: "BAST Digital Handover", Status: "IN_PROGRESS", ProgressPct: 40},
		{No: 15, Activity: "Project Closing", Phase: "Handover & Closing", KubikMadani: domain.RACIAccountable, AKS: domain.RACIInformed, Artacomindo: domain.RACIInformed, Ericsson: domain.RACIConsulted, Deliverable: "Project Closure & Audit Report", Status: "PENDING", ProgressPct: 20},
	}

	// Calculate summary stats
	completed := 0
	inProgress := 0
	pending := 0
	totalPct := 0

	for _, act := range activities {
		if act.Status == "COMPLETED" {
			completed++
		} else if act.Status == "IN_PROGRESS" {
			inProgress++
		} else {
			pending++
		}
		totalPct += act.ProgressPct
	}

	overallProgress := totalPct / len(activities)

	summary := &domain.ProjectTimelineSummary{
		TotalActivities: len(activities),
		CompletedCount:  completed,
		InProgressCount: inProgress,
		PendingCount:    pending,
		OverallProgress: overallProgress,
		Activities:      activities,
	}

	_ = ctx
	_ = totalSites
	response.Success(c, http.StatusOK, "Project timeline fetched successfully", summary)
}
