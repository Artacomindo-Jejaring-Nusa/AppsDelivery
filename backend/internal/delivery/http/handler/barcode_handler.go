package handler

import (
	"net/http"

	"backend-delivery/internal/domain"
	"backend-delivery/pkg/response"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// BarcodeHandler handles barcode-related HTTP requests.
type BarcodeHandler struct {
	barcodeUsecase domain.BarcodeUsecase
}

// NewBarcodeHandler creates a new BarcodeHandler.
func NewBarcodeHandler(barcodeUsecase domain.BarcodeUsecase) *BarcodeHandler {
	return &BarcodeHandler{barcodeUsecase: barcodeUsecase}
}

// Generate handles POST /api/v1/assets/:id/barcode
func (h *BarcodeHandler) Generate(c *gin.Context) {
	assetID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "Invalid asset ID", nil)
		return
	}

	barcode, err := h.barcodeUsecase.GenerateForAsset(c.Request.Context(), assetID)
	if err != nil {
		response.BadRequest(c, err.Error(), nil)
		return
	}

	response.Success(c, http.StatusCreated, "Barcode generated successfully", barcode)
}

// Lookup handles GET /api/v1/barcodes/:code
func (h *BarcodeHandler) Lookup(c *gin.Context) {
	code := c.Param("code")
	if code == "" {
		response.BadRequest(c, "Barcode code is required", nil)
		return
	}

	barcode, err := h.barcodeUsecase.LookupByCode(c.Request.Context(), code)
	if err != nil {
		response.NotFound(c, err.Error())
		return
	}

	response.Success(c, http.StatusOK, "Barcode found", barcode)
}

// Scan handles POST /api/v1/barcodes/:code/scan
func (h *BarcodeHandler) Scan(c *gin.Context) {
	code := c.Param("code")
	if code == "" {
		response.BadRequest(c, "Barcode code is required", nil)
		return
	}

	userID, _ := c.Get("user_id")
	uid := userID.(uuid.UUID)

	barcode, err := h.barcodeUsecase.MarkScanned(c.Request.Context(), code, uid)
	if err != nil {
		response.BadRequest(c, err.Error(), nil)
		return
	}

	response.Success(c, http.StatusOK, "Barcode scanned successfully", barcode)
}
