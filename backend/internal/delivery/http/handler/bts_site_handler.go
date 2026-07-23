package handler

import (
	"net/http"

	"backend-delivery/internal/domain"
	"backend-delivery/pkg/response"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// BtsSiteHandler handles BTS site-related HTTP requests.
type BtsSiteHandler struct {
	btsSiteUsecase domain.BtsSiteUsecase
}

// NewBtsSiteHandler creates a new BtsSiteHandler.
func NewBtsSiteHandler(btsSiteUsecase domain.BtsSiteUsecase) *BtsSiteHandler {
	return &BtsSiteHandler{btsSiteUsecase: btsSiteUsecase}
}

// Create handles POST /api/v1/bts-sites
func (h *BtsSiteHandler) Create(c *gin.Context) {
	var req domain.CreateBtsSiteRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid request body", err.Error())
		return
	}

	site, err := h.btsSiteUsecase.Create(c.Request.Context(), &req)
	if err != nil {
		response.BadRequest(c, err.Error(), nil)
		return
	}

	response.Success(c, http.StatusCreated, "BTS site created successfully", site)
}

// GetByID handles GET /api/v1/bts-sites/:id
func (h *BtsSiteHandler) GetByID(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "Invalid BTS site ID", nil)
		return
	}

	site, err := h.btsSiteUsecase.GetByID(c.Request.Context(), id)
	if err != nil {
		response.NotFound(c, err.Error())
		return
	}

	response.Success(c, http.StatusOK, "BTS site retrieved", site)
}

// GetAll handles GET /api/v1/bts-sites
func (h *BtsSiteHandler) GetAll(c *gin.Context) {
	var pagination domain.PaginationRequest
	if err := c.ShouldBindQuery(&pagination); err != nil {
		response.BadRequest(c, "Invalid query parameters", err.Error())
		return
	}
	pagination.SetDefaults()

	sites, total, err := h.btsSiteUsecase.GetAll(c.Request.Context(), &pagination)
	if err != nil {
		response.InternalServerError(c, err.Error())
		return
	}

	totalPages := int(total) / pagination.PerPage
	if int(total)%pagination.PerPage > 0 {
		totalPages++
	}

	response.SuccessWithMeta(c, http.StatusOK, "BTS sites retrieved", sites, &response.Meta{
		Page:       pagination.Page,
		PerPage:    pagination.PerPage,
		Total:      total,
		TotalPages: totalPages,
	})
}

// Update handles PUT /api/v1/bts-sites/:id
func (h *BtsSiteHandler) Update(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "Invalid BTS site ID", nil)
		return
	}

	var req domain.UpdateBtsSiteRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid request body", err.Error())
		return
	}

	site, err := h.btsSiteUsecase.Update(c.Request.Context(), id, &req)
	if err != nil {
		response.BadRequest(c, err.Error(), nil)
		return
	}

	response.Success(c, http.StatusOK, "BTS site updated successfully", site)
}

// Delete handles DELETE /api/v1/bts-sites/:id
func (h *BtsSiteHandler) Delete(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "Invalid BTS site ID", nil)
		return
	}

	if err := h.btsSiteUsecase.Delete(c.Request.Context(), id); err != nil {
		response.BadRequest(c, err.Error(), nil)
		return
	}

	response.Success(c, http.StatusOK, "BTS site deleted successfully", nil)
}
