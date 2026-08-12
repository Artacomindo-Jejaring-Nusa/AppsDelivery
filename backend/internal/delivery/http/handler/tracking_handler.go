package handler

import (
	"net/http"
	"strings"
	"time"

	"backend-delivery/internal/domain"
	"backend-delivery/pkg/response"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type TrackingHandler struct {
	doRepo       domain.DeliveryOrderRepository
	manifestRepo domain.ManifestRepository
	assetRepo    domain.DismantleAssetRepository
	siteRepo     domain.BtsSiteRepository
	driverRepo   domain.DriverRepository
	locRepo      domain.DriverLocationRepository
	barcodeRepo  domain.BarcodeRepository
}

func NewTrackingHandler(
	doRepo domain.DeliveryOrderRepository,
	manifestRepo domain.ManifestRepository,
	assetRepo domain.DismantleAssetRepository,
	siteRepo domain.BtsSiteRepository,
	driverRepo domain.DriverRepository,
	locRepo domain.DriverLocationRepository,
	barcodeRepo domain.BarcodeRepository,
) *TrackingHandler {
	return &TrackingHandler{
		doRepo:       doRepo,
		manifestRepo: manifestRepo,
		assetRepo:    assetRepo,
		siteRepo:     siteRepo,
		driverRepo:   driverRepo,
		locRepo:      locRepo,
		barcodeRepo:  barcodeRepo,
	}
}

type TrackingStep struct {
	Step        int    `json:"step"`
	Title       string `json:"title"`
	Description string `json:"description"`
	Status      string `json:"status"` // 'completed', 'current', 'pending'
	Timestamp   string `json:"timestamp,omitempty"`
}

type TrackingDriverInfo struct {
	ID           uuid.UUID `json:"id"`
	FullName     string    `json:"full_name"`
	Phone        string    `json:"phone_number"`
	VehiclePlate string    `json:"vehicle_plate"`
	VehicleType  string    `json:"vehicle_type"`
	CurrentLat   *float64  `json:"current_lat,omitempty"`
	CurrentLng   *float64  `json:"current_lng,omitempty"`
}

type PublicTrackResponse struct {
	DONumber           string                   `json:"do_number"`
	Description        string                   `json:"description"`
	Status             string                   `json:"status"`
	SLAStatus          string                   `json:"sla_status"`
	SLADeadline        string                   `json:"sla_deadline,omitempty"`
	SLADays            int                      `json:"sla_days"`
	SLAHours           int                      `json:"sla_hours"`
	OriginAddress      string                   `json:"origin_address"`
	DestinationAddress string                   `json:"destination_address"`
	Notes              string                   `json:"notes,omitempty"`
	CreatedAt          time.Time                `json:"created_at"`
	UpdatedAt          time.Time                `json:"updated_at"`
	Site               *domain.BtsSite          `json:"site,omitempty"`
	Manifest           *domain.Manifest         `json:"manifest,omitempty"`
	Driver             *TrackingDriverInfo      `json:"driver,omitempty"`
	Assets             []*domain.DismantleAsset `json:"assets"`
	Timeline           []TrackingStep           `json:"timeline"`
}

// PublicTrack handles GET /api/v1/track/:tracking_number
func (h *TrackingHandler) PublicTrack(c *gin.Context) {
	ctx := c.Request.Context()
	rawInput := strings.TrimSpace(c.Param("tracking_number"))
	if rawInput == "" {
		response.BadRequest(c, "Tracking number is required", nil)
		return
	}

	var targetDO *domain.DeliveryOrder

	cleanInput := strings.TrimPrefix(strings.TrimPrefix(rawInput, "INB-"), "OTB-")

	// 1. Try finding directly by DO Number (e.g. DO-2026-08-002) or ID
	if parsedUUID, uuidErr := uuid.Parse(cleanInput); uuidErr == nil {
		targetDO, _ = h.doRepo.FindByID(ctx, parsedUUID)
	}
	if targetDO == nil {
		targetDO, _ = h.doRepo.FindByDONumber(ctx, cleanInput)
	}
	if targetDO == nil {
		targetDO, _ = h.doRepo.FindByDONumber(ctx, rawInput)
	}

	// 2. If barcode format (e.g. INB-DO-... or OTB-DO-...), find via barcode table
	if targetDO == nil && (strings.HasPrefix(strings.ToUpper(rawInput), "INB-") || strings.HasPrefix(strings.ToUpper(rawInput), "OTB-")) {
		bc, _ := h.barcodeRepo.FindByBarcodeData(ctx, rawInput)
		if bc != nil {
			asset, _ := h.assetRepo.FindByID(ctx, bc.AssetID)
			if asset != nil {
				targetDO, _ = h.doRepo.FindByID(ctx, asset.DeliveryOrderID)
			}
		}
	}

	// 3. If still not found, search in Manifest table by manifest_number
	var targetManifest *domain.Manifest
	if targetDO == nil {
		manifests, _, _ := h.manifestRepo.FindAll(ctx, &domain.PaginationRequest{Page: 1, PerPage: 50})
		for _, m := range manifests {
			if strings.EqualFold(m.ManifestNumber, rawInput) {
				targetManifest = m
				if len(m.Items) > 0 && m.Items[0].DeliveryOrder != nil {
					targetDO = m.Items[0].DeliveryOrder
				} else if len(m.Items) > 0 {
					targetDO, _ = h.doRepo.FindByID(ctx, m.Items[0].DeliveryOrderID)
				}
				break
			}
		}
	}

	if targetDO == nil {
		response.NotFound(c, "No shipment found matching tracking number: "+rawInput)
		return
	}

	// 4. Fetch attached BTS Site details if available
	var btsSite *domain.BtsSite
	if targetDO.BtsSiteID != nil {
		btsSite, _ = h.siteRepo.FindByID(ctx, *targetDO.BtsSiteID)
	}

	// 5. Fetch attached assets / dismantle items
	assets, _, _ := h.assetRepo.FindByDeliveryOrderID(ctx, targetDO.ID, &domain.PaginationRequest{Page: 1, PerPage: 100})

	// 6. Fetch manifest & assigned driver
	if targetManifest == nil {
		manifests, _, _ := h.manifestRepo.FindAll(ctx, &domain.PaginationRequest{Page: 1, PerPage: 100})
		for _, m := range manifests {
			for _, item := range m.Items {
				if item.DeliveryOrderID == targetDO.ID {
					targetManifest = m
					break
				}
			}
			if targetManifest != nil {
				break
			}
		}
	}

	var driverInfo *TrackingDriverInfo
	if targetManifest != nil && targetManifest.DriverID != nil {
		driver, _ := h.driverRepo.FindByID(ctx, *targetManifest.DriverID)
		if driver != nil {
			driverInfo = &TrackingDriverInfo{
				ID:           driver.ID,
				FullName:     driver.FullName,
				Phone:        driver.Phone,
				VehiclePlate: driver.VehiclePlate,
				VehicleType:  driver.VehicleType,
			}
			loc, _ := h.locRepo.GetLatestByDriverID(ctx, driver.ID)
			if loc != nil {
				driverInfo.CurrentLat = &loc.Latitude
				driverInfo.CurrentLng = &loc.Longitude
			}
		}
	}

	// 7. Build Timeline Steps based on status
	status := strings.ToLower(targetDO.Status)
	timeline := []TrackingStep{
		{
			Step:        1,
			Title:       "Order Created",
			Description: "Delivery order issued & logged into system",
			Status:      "completed",
			Timestamp:   targetDO.CreatedAt.Format("02 Jan 2006, 15:04"),
		},
		{
			Step:        2,
			Title:       "Assigned to Courier",
			Description: selectVal(driverInfo != nil, "Manifest assigned to "+safeDriverName(driverInfo), "Awaiting courier assignment"),
			Status:      selectVal(status == "assigned" || status == "in_transit" || status == "delivered" || status == "completed", "completed", "pending"),
		},
		{
			Step:        3,
			Title:       "In Transit / On the Way",
			Description: selectVal(driverInfo != nil, "Courier en route to BTS Site "+safeSiteName(btsSite), "En route to destination"),
			Status:      selectVal(status == "in_transit", "current", selectVal(status == "delivered" || status == "completed", "completed", "pending")),
		},
		{
			Step:        4,
			Title:       "Delivered & Verified",
			Description: selectVal(status == "delivered" || status == "completed", "Goods received & verified at site", "Awaiting arrival at destination"),
			Status:      selectVal(status == "delivered" || status == "completed", "completed", "pending"),
			Timestamp:   selectVal(status == "delivered" || status == "completed", targetDO.UpdatedAt.Format("02 Jan 2006, 15:04"), ""),
		},
	}

	res := PublicTrackResponse{
		DONumber:           targetDO.DONumber,
		Description:        targetDO.Description,
		Status:             targetDO.Status,
		SLAStatus:          targetDO.SLAStatus,
		SLADays:            targetDO.SLADays,
		SLAHours:           targetDO.SLAHours,
		OriginAddress:      targetDO.OriginAddress,
		DestinationAddress: targetDO.DestinationAddress,
		Notes:              targetDO.Notes,
		CreatedAt:          targetDO.CreatedAt,
		UpdatedAt:          targetDO.UpdatedAt,
		Site:               btsSite,
		Manifest:           targetManifest,
		Driver:             driverInfo,
		Assets:             assets,
		Timeline:           timeline,
	}
	if targetDO.SLADeadline != nil {
		res.SLADeadline = targetDO.SLADeadline.Format(time.RFC3339)
	}

	response.Success(c, http.StatusOK, "Shipment tracking data retrieved", res)
}

func selectVal(cond bool, a, b string) string {
	if cond {
		return a
	}
	return b
}

func safeDriverName(d *TrackingDriverInfo) string {
	if d != nil && d.FullName != "" {
		return d.FullName
	}
	return "Driver"
}

func safeSiteName(s *domain.BtsSite) string {
	if s != nil && s.SiteName != "" {
		return s.SiteName
	}
	return "Ericsson BTS Site"
}
