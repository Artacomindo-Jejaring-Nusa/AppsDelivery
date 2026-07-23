package handler

import (
	"net/http"

	"backend-delivery/internal/domain"
	"backend-delivery/pkg/response"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// DismantleAssetHandler handles dismantle asset HTTP requests.
type DismantleAssetHandler struct {
	assetUsecase domain.DismantleAssetUsecase
}

// NewDismantleAssetHandler creates a new DismantleAssetHandler.
func NewDismantleAssetHandler(assetUsecase domain.DismantleAssetUsecase) *DismantleAssetHandler {
	return &DismantleAssetHandler{assetUsecase: assetUsecase}
}

// Create handles POST /api/v1/delivery-orders/:id/assets
func (h *DismantleAssetHandler) Create(c *gin.Context) {
	doID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "Invalid delivery order ID", nil)
		return
	}

	var req domain.CreateDismantleAssetRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid request body", err.Error())
		return
	}

	userID, _ := c.Get("user_id")
	uid := userID.(uuid.UUID)

	asset, err := h.assetUsecase.Create(c.Request.Context(), doID, &req, uid)
	if err != nil {
		response.BadRequest(c, err.Error(), nil)
		return
	}

	response.Success(c, http.StatusCreated, "Asset created successfully", asset)
}

// CreateBatch handles POST /api/v1/delivery-orders/:id/assets/batch
func (h *DismantleAssetHandler) CreateBatch(c *gin.Context) {
	doID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "Invalid delivery order ID", nil)
		return
	}

	var req domain.BatchCreateDismantleAssetRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid request body", err.Error())
		return
	}

	userID, _ := c.Get("user_id")
	uid := userID.(uuid.UUID)

	assets, err := h.assetUsecase.CreateBatch(c.Request.Context(), doID, &req, uid)
	if err != nil {
		response.BadRequest(c, err.Error(), nil)
		return
	}

	response.Success(c, http.StatusCreated, "Assets created successfully", assets)
}

// GetByDeliveryOrderID handles GET /api/v1/delivery-orders/:id/assets
func (h *DismantleAssetHandler) GetByDeliveryOrderID(c *gin.Context) {
	doID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "Invalid delivery order ID", nil)
		return
	}

	var pagination domain.PaginationRequest
	if err := c.ShouldBindQuery(&pagination); err != nil {
		response.BadRequest(c, "Invalid query parameters", err.Error())
		return
	}
	pagination.SetDefaults()

	assets, total, err := h.assetUsecase.GetByDeliveryOrderID(c.Request.Context(), doID, &pagination)
	if err != nil {
		response.InternalServerError(c, err.Error())
		return
	}

	totalPages := int(total) / pagination.PerPage
	if int(total)%pagination.PerPage > 0 {
		totalPages++
	}

	response.SuccessWithMeta(c, http.StatusOK, "Assets retrieved", assets, &response.Meta{
		Page:       pagination.Page,
		PerPage:    pagination.PerPage,
		Total:      total,
		TotalPages: totalPages,
	})
}

// Update handles PUT /api/v1/assets/:id
func (h *DismantleAssetHandler) Update(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "Invalid asset ID", nil)
		return
	}

	var req domain.UpdateDismantleAssetRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid request body", err.Error())
		return
	}

	asset, err := h.assetUsecase.Update(c.Request.Context(), id, &req)
	if err != nil {
		response.BadRequest(c, err.Error(), nil)
		return
	}

	response.Success(c, http.StatusOK, "Asset updated successfully", asset)
}

// Delete handles DELETE /api/v1/assets/:id
func (h *DismantleAssetHandler) Delete(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "Invalid asset ID", nil)
		return
	}

	if err := h.assetUsecase.Delete(c.Request.Context(), id); err != nil {
		response.BadRequest(c, err.Error(), nil)
		return
	}

	response.Success(c, http.StatusOK, "Asset deleted successfully", nil)
}
