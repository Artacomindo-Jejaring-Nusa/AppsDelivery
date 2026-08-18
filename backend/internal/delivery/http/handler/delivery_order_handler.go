package handler

import (
	"net/http"

	"backend-delivery/internal/domain"
	"backend-delivery/pkg/response"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// DeliveryOrderHandler handles delivery order HTTP requests.
type DeliveryOrderHandler struct {
	doUsecase domain.DeliveryOrderUsecase
}

// NewDeliveryOrderHandler creates a new DeliveryOrderHandler.
func NewDeliveryOrderHandler(doUsecase domain.DeliveryOrderUsecase) *DeliveryOrderHandler {
	return &DeliveryOrderHandler{doUsecase: doUsecase}
}

// Create handles POST /api/v1/delivery-orders
func (h *DeliveryOrderHandler) Create(c *gin.Context) {
	var req domain.CreateDeliveryOrderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid request body", err.Error())
		return
	}

	userID, _ := c.Get("user_id")
	uid := userID.(uuid.UUID)

	do, err := h.doUsecase.Create(c.Request.Context(), &req, uid)
	if err != nil {
		response.BadRequest(c, err.Error(), nil)
		return
	}

	response.Success(c, http.StatusCreated, "Delivery order created successfully", do)
}

// BulkCreate handles POST /api/v1/delivery-orders/bulk
func (h *DeliveryOrderHandler) BulkCreate(c *gin.Context) {
	var req domain.BulkCreateDeliveryOrderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Request format tidak valid. Maksimal 10 DO per import.", err.Error())
		return
	}

	userID, _ := c.Get("user_id")
	uid := userID.(uuid.UUID)

	orders, err := h.doUsecase.BulkCreate(c.Request.Context(), &req, uid)
	if err != nil {
		response.BadRequest(c, err.Error(), nil)
		return
	}

	response.Success(c, http.StatusCreated, "Berhasil mengimpor Delivery Orders", orders)
}

// GetByID handles GET /api/v1/delivery-orders/:id
func (h *DeliveryOrderHandler) GetByID(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "Invalid delivery order ID", nil)
		return
	}

	do, err := h.doUsecase.GetByID(c.Request.Context(), id)
	if err != nil {
		response.NotFound(c, err.Error())
		return
	}

	response.Success(c, http.StatusOK, "Delivery order retrieved", do)
}

// GetAll handles GET /api/v1/delivery-orders
func (h *DeliveryOrderHandler) GetAll(c *gin.Context) {
	var filter domain.DOFilterRequest
	if err := c.ShouldBindQuery(&filter); err != nil {
		response.BadRequest(c, "Invalid query parameters", err.Error())
		return
	}
	filter.SetDefaults()

	orders, total, err := h.doUsecase.GetAll(c.Request.Context(), &filter)
	if err != nil {
		response.InternalServerError(c, err.Error())
		return
	}

	totalPages := int(total) / filter.PerPage
	if int(total)%filter.PerPage > 0 {
		totalPages++
	}

	response.SuccessWithMeta(c, http.StatusOK, "Delivery orders retrieved", orders, &response.Meta{
		Page:       filter.Page,
		PerPage:    filter.PerPage,
		Total:      total,
		TotalPages: totalPages,
	})
}

// UpdateStatus handles PUT /api/v1/delivery-orders/:id/status
func (h *DeliveryOrderHandler) UpdateStatus(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "Invalid delivery order ID", nil)
		return
	}

	var req domain.UpdateDOStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid request body", err.Error())
		return
	}

	do, err := h.doUsecase.UpdateStatus(c.Request.Context(), id, &req)
	if err != nil {
		response.BadRequest(c, err.Error(), nil)
		return
	}

	response.Success(c, http.StatusOK, "Delivery order status updated", do)
}
