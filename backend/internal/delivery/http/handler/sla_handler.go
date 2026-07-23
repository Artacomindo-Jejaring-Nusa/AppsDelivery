package handler

import (
	"net/http"

	"backend-delivery/internal/domain"
	"backend-delivery/pkg/response"

	"github.com/gin-gonic/gin"
)

// SLAHandler handles SLA-related HTTP requests.
type SLAHandler struct {
	slaUsecase domain.SLAEngineUsecase
}

// NewSLAHandler creates a new SLAHandler.
func NewSLAHandler(slaUsecase domain.SLAEngineUsecase) *SLAHandler {
	return &SLAHandler{slaUsecase: slaUsecase}
}

// GetSummary handles GET /api/v1/sla/summary
func (h *SLAHandler) GetSummary(c *gin.Context) {
	summary, err := h.slaUsecase.GetSummary(c.Request.Context())
	if err != nil {
		response.InternalServerError(c, err.Error())
		return
	}

	response.Success(c, http.StatusOK, "SLA summary retrieved", summary)
}

// GetLogs handles GET /api/v1/sla/logs
func (h *SLAHandler) GetLogs(c *gin.Context) {
	var pagination domain.PaginationRequest
	if err := c.ShouldBindQuery(&pagination); err != nil {
		response.BadRequest(c, "Invalid query parameters", err.Error())
		return
	}
	pagination.SetDefaults()

	logs, total, err := h.slaUsecase.GetLogs(c.Request.Context(), &pagination)
	if err != nil {
		response.InternalServerError(c, err.Error())
		return
	}

	totalPages := int(total) / pagination.PerPage
	if int(total)%pagination.PerPage > 0 {
		totalPages++
	}

	response.SuccessWithMeta(c, http.StatusOK, "SLA logs retrieved", logs, &response.Meta{
		Page:       pagination.Page,
		PerPage:    pagination.PerPage,
		Total:      total,
		TotalPages: totalPages,
	})
}
