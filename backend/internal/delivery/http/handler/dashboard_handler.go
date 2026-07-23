package handler

import (
	"net/http"

	"backend-delivery/internal/domain"
	"backend-delivery/pkg/response"

	"github.com/gin-gonic/gin"
)

// DashboardHandler handles dashboard analytics HTTP requests.
type DashboardHandler struct {
	dashboardUsecase domain.DashboardUsecase
}

// NewDashboardHandler creates a new DashboardHandler.
func NewDashboardHandler(dashboardUsecase domain.DashboardUsecase) *DashboardHandler {
	return &DashboardHandler{dashboardUsecase: dashboardUsecase}
}

// GetStats handles GET /api/v1/dashboard/stats
func (h *DashboardHandler) GetStats(c *gin.Context) {
	stats, err := h.dashboardUsecase.GetStats(c.Request.Context())
	if err != nil {
		response.InternalServerError(c, err.Error())
		return
	}

	response.Success(c, http.StatusOK, "Dashboard statistics retrieved", stats)
}
