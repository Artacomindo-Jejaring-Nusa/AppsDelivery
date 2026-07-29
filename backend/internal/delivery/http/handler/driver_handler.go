package handler

import (
	"net/http"

	"backend-delivery/internal/domain"
	"backend-delivery/pkg/response"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// DriverHandler handles driver-related HTTP requests.
type DriverHandler struct {
	driverUsecase domain.DriverUsecase
}

// NewDriverHandler creates a new DriverHandler.
func NewDriverHandler(driverUsecase domain.DriverUsecase) *DriverHandler {
	return &DriverHandler{driverUsecase: driverUsecase}
}

// Create handles POST /api/v1/drivers
func (h *DriverHandler) Create(c *gin.Context) {
	var req domain.CreateDriverRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid request body", err.Error())
		return
	}

	driver, err := h.driverUsecase.Create(c.Request.Context(), &req)
	if err != nil {
		response.BadRequest(c, err.Error(), nil)
		return
	}

	response.Success(c, http.StatusCreated, "Driver created successfully", driver)
}

// GetByID handles GET /api/v1/drivers/:id
func (h *DriverHandler) GetByID(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "Invalid driver ID", nil)
		return
	}

	driver, err := h.driverUsecase.GetByID(c.Request.Context(), id)
	if err != nil {
		response.NotFound(c, err.Error())
		return
	}

	response.Success(c, http.StatusOK, "Driver retrieved", driver)
}

// GetAll handles GET /api/v1/drivers
func (h *DriverHandler) GetAll(c *gin.Context) {
	if c.Query("available") == "true" {
		drivers, err := h.driverUsecase.GetAvailable(c.Request.Context())
		if err != nil {
			response.InternalServerError(c, err.Error())
			return
		}
		response.Success(c, http.StatusOK, "Available drivers retrieved", drivers)
		return
	}

	var pagination domain.PaginationRequest
	if err := c.ShouldBindQuery(&pagination); err != nil {
		response.BadRequest(c, "Invalid query parameters", err.Error())
		return
	}
	pagination.SetDefaults()

	drivers, total, err := h.driverUsecase.GetAll(c.Request.Context(), &pagination)
	if err != nil {
		response.InternalServerError(c, err.Error())
		return
	}

	totalPages := int(total) / pagination.PerPage
	if int(total)%pagination.PerPage > 0 {
		totalPages++
	}

	response.SuccessWithMeta(c, http.StatusOK, "Drivers retrieved", drivers, &response.Meta{
		Page:       pagination.Page,
		PerPage:    pagination.PerPage,
		Total:      total,
		TotalPages: totalPages,
	})
}

// Update handles PUT /api/v1/drivers/:id
func (h *DriverHandler) Update(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "Invalid driver ID", nil)
		return
	}

	var req domain.UpdateDriverRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid request body", err.Error())
		return
	}

	driver, err := h.driverUsecase.Update(c.Request.Context(), id, &req)
	if err != nil {
		response.BadRequest(c, err.Error(), nil)
		return
	}

	response.Success(c, http.StatusOK, "Driver updated successfully", driver)
}

// Delete handles DELETE /api/v1/drivers/:id
func (h *DriverHandler) Delete(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "Invalid driver ID", nil)
		return
	}

	if err := h.driverUsecase.Delete(c.Request.Context(), id); err != nil {
		response.BadRequest(c, err.Error(), nil)
		return
	}

	response.Success(c, http.StatusOK, "Driver deleted successfully", nil)
}
