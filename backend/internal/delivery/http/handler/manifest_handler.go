package handler

import (
	"net/http"

	"backend-delivery/internal/domain"
	"backend-delivery/pkg/response"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// ManifestHandler handles manifest-related HTTP requests.
type ManifestHandler struct {
	manifestUsecase domain.ManifestUsecase
}

// NewManifestHandler creates a new ManifestHandler.
func NewManifestHandler(manifestUsecase domain.ManifestUsecase) *ManifestHandler {
	return &ManifestHandler{manifestUsecase: manifestUsecase}
}

// Create handles POST /api/v1/manifests
func (h *ManifestHandler) Create(c *gin.Context) {
	var req domain.CreateManifestRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid request body", err.Error())
		return
	}

	userID, _ := c.Get("user_id")
	uid := userID.(uuid.UUID)

	manifest, err := h.manifestUsecase.Create(c.Request.Context(), &req, uid)
	if err != nil {
		response.BadRequest(c, err.Error(), nil)
		return
	}

	response.Success(c, http.StatusCreated, "Manifest created successfully", manifest)
}

// GetByID handles GET /api/v1/manifests/:id
func (h *ManifestHandler) GetByID(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "Invalid manifest ID", nil)
		return
	}

	manifest, err := h.manifestUsecase.GetByID(c.Request.Context(), id)
	if err != nil {
		response.NotFound(c, err.Error())
		return
	}

	response.Success(c, http.StatusOK, "Manifest retrieved", manifest)
}

// GetAll handles GET /api/v1/manifests
func (h *ManifestHandler) GetAll(c *gin.Context) {
	var pagination domain.PaginationRequest
	if err := c.ShouldBindQuery(&pagination); err != nil {
		response.BadRequest(c, "Invalid query parameters", err.Error())
		return
	}
	pagination.SetDefaults()

	manifests, total, err := h.manifestUsecase.GetAll(c.Request.Context(), &pagination)
	if err != nil {
		response.InternalServerError(c, err.Error())
		return
	}

	totalPages := int(total) / pagination.PerPage
	if int(total)%pagination.PerPage > 0 {
		totalPages++
	}

	response.SuccessWithMeta(c, http.StatusOK, "Manifests retrieved", manifests, &response.Meta{
		Page:       pagination.Page,
		PerPage:    pagination.PerPage,
		Total:      total,
		TotalPages: totalPages,
	})
}

// UpdateStatus handles PUT /api/v1/manifests/:id/status
func (h *ManifestHandler) UpdateStatus(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "Invalid manifest ID", nil)
		return
	}

	var req domain.UpdateManifestStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid request body", err.Error())
		return
	}

	manifest, err := h.manifestUsecase.UpdateStatus(c.Request.Context(), id, &req)
	if err != nil {
		response.BadRequest(c, err.Error(), nil)
		return
	}

	response.Success(c, http.StatusOK, "Manifest status updated", manifest)
}
