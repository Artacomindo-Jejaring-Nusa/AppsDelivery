package handler

import (
	"net/http"

	"backend-delivery/internal/domain"
	"backend-delivery/pkg/response"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// AuthHandler handles authentication-related HTTP requests.
type AuthHandler struct {
	authUsecase domain.AuthUsecase
}

// NewAuthHandler creates a new AuthHandler.
func NewAuthHandler(authUsecase domain.AuthUsecase) *AuthHandler {
	return &AuthHandler{authUsecase: authUsecase}
}

// Login handles POST /api/v1/auth/login
func (h *AuthHandler) Login(c *gin.Context) {
	var req domain.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid request body", err.Error())
		return
	}

	result, err := h.authUsecase.Login(c.Request.Context(), &req)
	if err != nil {
		response.Unauthorized(c, err.Error())
		return
	}

	response.Success(c, http.StatusOK, "Login successful", result)
}

// Register handles POST /api/v1/auth/register
func (h *AuthHandler) Register(c *gin.Context) {
	var req domain.RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid request body", err.Error())
		return
	}

	user, err := h.authUsecase.Register(c.Request.Context(), &req)
	if err != nil {
		response.BadRequest(c, err.Error(), nil)
		return
	}

	response.Success(c, http.StatusCreated, "User registered successfully", user)
}

// GetProfile handles GET /api/v1/users/me
func (h *AuthHandler) GetProfile(c *gin.Context) {
	userID, _ := c.Get("user_id")
	uid, ok := userID.(uuid.UUID)
	if !ok {
		response.Unauthorized(c, "Invalid user ID in token")
		return
	}

	user, err := h.authUsecase.GetProfile(c.Request.Context(), uid)
	if err != nil {
		response.NotFound(c, err.Error())
		return
	}

	response.Success(c, http.StatusOK, "Profile retrieved", user)
}

// GetAllUsers handles GET /api/v1/users
func (h *AuthHandler) GetAllUsers(c *gin.Context) {
	var pagination domain.PaginationRequest
	if err := c.ShouldBindQuery(&pagination); err != nil {
		response.BadRequest(c, "Invalid query parameters", err.Error())
		return
	}
	pagination.SetDefaults()

	users, total, err := h.authUsecase.GetAllUsers(c.Request.Context(), &pagination)
	if err != nil {
		response.InternalServerError(c, err.Error())
		return
	}

	totalPages := int(total) / pagination.PerPage
	if int(total)%pagination.PerPage > 0 {
		totalPages++
	}

	response.SuccessWithMeta(c, http.StatusOK, "Users retrieved", users, &response.Meta{
		Page:       pagination.Page,
		PerPage:    pagination.PerPage,
		Total:      total,
		TotalPages: totalPages,
	})
}

// UpdateUser handles PUT /api/v1/users/:id
func (h *AuthHandler) UpdateUser(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "Invalid user ID", nil)
		return
	}

	var req domain.UpdateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid request body", err.Error())
		return
	}

	user, err := h.authUsecase.UpdateUser(c.Request.Context(), id, &req)
	if err != nil {
		response.BadRequest(c, err.Error(), nil)
		return
	}

	response.Success(c, http.StatusOK, "User updated successfully", user)
}
