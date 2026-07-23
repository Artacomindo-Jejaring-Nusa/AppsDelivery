package response

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// Response is the standard API response wrapper.
type Response struct {
	Success bool        `json:"success"`
	Message string      `json:"message"`
	Data    interface{} `json:"data,omitempty"`
	Meta    *Meta       `json:"meta,omitempty"`
	Errors  interface{} `json:"errors,omitempty"`
}

// Meta holds pagination metadata.
type Meta struct {
	Page       int   `json:"page"`
	PerPage    int   `json:"per_page"`
	Total      int64 `json:"total"`
	TotalPages int   `json:"total_pages"`
}

// Success sends a success response with data.
func Success(c *gin.Context, statusCode int, message string, data interface{}) {
	c.JSON(statusCode, Response{
		Success: true,
		Message: message,
		Data:    data,
	})
}

// SuccessWithMeta sends a success response with data and pagination meta.
func SuccessWithMeta(c *gin.Context, statusCode int, message string, data interface{}, meta *Meta) {
	c.JSON(statusCode, Response{
		Success: true,
		Message: message,
		Data:    data,
		Meta:    meta,
	})
}

// Error sends an error response.
func Error(c *gin.Context, statusCode int, message string, errs interface{}) {
	c.JSON(statusCode, Response{
		Success: false,
		Message: message,
		Errors:  errs,
	})
}

// BadRequest sends a 400 error response.
func BadRequest(c *gin.Context, message string, errs interface{}) {
	Error(c, http.StatusBadRequest, message, errs)
}

// Unauthorized sends a 401 error response.
func Unauthorized(c *gin.Context, message string) {
	Error(c, http.StatusUnauthorized, message, nil)
}

// Forbidden sends a 403 error response.
func Forbidden(c *gin.Context, message string) {
	Error(c, http.StatusForbidden, message, nil)
}

// NotFound sends a 404 error response.
func NotFound(c *gin.Context, message string) {
	Error(c, http.StatusNotFound, message, nil)
}

// InternalServerError sends a 500 error response.
func InternalServerError(c *gin.Context, message string) {
	Error(c, http.StatusInternalServerError, message, nil)
}
