package handler

import (
	"net/http"
	"strconv"

	"backend-delivery/internal/domain"
	"backend-delivery/pkg/response"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// DriverLocationHandler handles driver tracking coordinate HTTP requests.
type DriverLocationHandler struct {
	locUsecase domain.DriverLocationUsecase
}

// NewDriverLocationHandler creates a new DriverLocationHandler.
func NewDriverLocationHandler(locUsecase domain.DriverLocationUsecase) *DriverLocationHandler {
	return &DriverLocationHandler{locUsecase: locUsecase}
}

// Track handles POST /api/v1/drivers/location (Driver submits current coordinates)
func (h *DriverLocationHandler) Track(c *gin.Context) {
	var req domain.SaveDriverLocationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid coordinates payload", err.Error())
		return
	}

	userID, _ := c.Get("user_id")
	uid := userID.(uuid.UUID)

	loc, err := h.locUsecase.Track(c.Request.Context(), uid, &req)
	if err != nil {
		response.BadRequest(c, err.Error(), nil)
		return
	}

	response.Success(c, http.StatusCreated, "Location tracked successfully", loc)
}

// GetLatest handles GET /api/v1/drivers/:id/location (Get latest GPS coordinate of a driver)
func (h *DriverLocationHandler) GetLatest(c *gin.Context) {
	driverID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "Invalid driver ID", nil)
		return
	}

	loc, err := h.locUsecase.GetLatest(c.Request.Context(), driverID)
	if err != nil {
		response.NotFound(c, err.Error())
		return
	}

	response.Success(c, http.StatusOK, "Latest driver location retrieved", loc)
}

// GetHistory handles GET /api/v1/drivers/:id/location/history (Get tracking history logs)
func (h *DriverLocationHandler) GetHistory(c *gin.Context) {
	driverID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "Invalid driver ID", nil)
		return
	}

	limit := 50 // Default limit
	if limitStr := c.Query("limit"); limitStr != "" {
		if val, err := strconv.Atoi(limitStr); err == nil && val > 0 {
			limit = val
		}
	}

	history, err := h.locUsecase.GetHistory(c.Request.Context(), driverID, limit)
	if err != nil {
		response.BadRequest(c, err.Error(), nil)
		return
	}

	response.Success(c, http.StatusOK, "Driver location history retrieved", history)
}
