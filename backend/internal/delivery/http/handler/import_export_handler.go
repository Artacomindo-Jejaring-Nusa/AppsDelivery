package handler

import (
	"net/http"

	"backend-delivery/internal/domain"
	"backend-delivery/pkg/response"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// ImportExportHandler handles file import and report export HTTP endpoints.
type ImportExportHandler struct {
	ieUsecase domain.ImportExportUsecase
}

// NewImportExportHandler creates a new ImportExportHandler.
func NewImportExportHandler(ieUsecase domain.ImportExportUsecase) *ImportExportHandler {
	return &ImportExportHandler{ieUsecase: ieUsecase}
}

// ImportBtsSites handles POST /api/v1/bts-sites/import
func (h *ImportExportHandler) ImportBtsSites(c *gin.Context) {
	file, err := c.FormFile("file")
	if err != nil {
		response.BadRequest(c, "Please upload a CSV or XLSX file using form field 'file'", err.Error())
		return
	}

	src, err := file.Open()
	if err != nil {
		response.InternalServerError(c, "Failed to open file: "+err.Error())
		return
	}
	defer src.Close()

	result, err := h.ieUsecase.ImportBtsSites(c.Request.Context(), src, file.Filename)
	if err != nil {
		response.BadRequest(c, err.Error(), nil)
		return
	}

	response.Success(c, http.StatusOK, "BTS sites imported successfully", result)
}

// ImportDeliveryOrders handles POST /api/v1/delivery-orders/import
func (h *ImportExportHandler) ImportDeliveryOrders(c *gin.Context) {
	file, err := c.FormFile("file")
	if err != nil {
		response.BadRequest(c, "Please upload a CSV or XLSX file using form field 'file'", err.Error())
		return
	}

	src, err := file.Open()
	if err != nil {
		response.InternalServerError(c, "Failed to open file: "+err.Error())
		return
	}
	defer src.Close()

	userID, _ := c.Get("user_id")
	uid := userID.(uuid.UUID)

	result, err := h.ieUsecase.ImportDeliveryOrders(c.Request.Context(), src, file.Filename, uid)
	if err != nil {
		response.BadRequest(c, err.Error(), nil)
		return
	}

	response.Success(c, http.StatusOK, "Delivery orders imported successfully", result)
}

// ExportDeliveryOrders handles GET /api/v1/reports/export/delivery-orders
func (h *ImportExportHandler) ExportDeliveryOrders(c *gin.Context) {
	data, filename, err := h.ieUsecase.ExportDeliveryOrders(c.Request.Context())
	if err != nil {
		response.InternalServerError(c, err.Error())
		return
	}

	c.Header("Content-Disposition", "attachment; filename="+filename)
	c.Header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	c.Data(http.StatusOK, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", data)
}

// ExportDismantleAssets handles GET /api/v1/reports/export/dismantle-assets
func (h *ImportExportHandler) ExportDismantleAssets(c *gin.Context) {
	data, filename, err := h.ieUsecase.ExportDismantleAssets(c.Request.Context())
	if err != nil {
		response.InternalServerError(c, err.Error())
		return
	}

	c.Header("Content-Disposition", "attachment; filename="+filename)
	c.Header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	c.Data(http.StatusOK, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", data)
}

// ExportActivityLogs handles GET /api/v1/reports/export/activity-logs
func (h *ImportExportHandler) ExportActivityLogs(c *gin.Context) {
	data, filename, err := h.ieUsecase.ExportActivityLogs(c.Request.Context())
	if err != nil {
		response.InternalServerError(c, err.Error())
		return
	}

	c.Header("Content-Disposition", "attachment; filename="+filename)
	c.Header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	c.Data(http.StatusOK, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", data)
}

