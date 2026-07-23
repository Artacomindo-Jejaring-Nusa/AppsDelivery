package domain

import (
	"context"
	"time"

	"github.com/google/uuid"
)

// User represents a system user (Admin, Dispatcher, Driver, Data Entry).
type User struct {
	ID           uuid.UUID  `json:"id"`
	Username     string     `json:"username"`
	Email        string     `json:"email"`
	PasswordHash string     `json:"-"` // never expose in JSON
	FullName     string     `json:"full_name"`
	Role         string     `json:"role"`
	Phone        string     `json:"phone"`
	IsActive     bool       `json:"is_active"`
	LastLoginAt  *time.Time `json:"last_login_at"`
	CreatedAt    time.Time  `json:"created_at"`
	UpdatedAt    time.Time  `json:"updated_at"`
}

// ---- Request / Response DTOs ----

// LoginRequest represents the login payload.
type LoginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

// LoginResponse represents the login response.
type LoginResponse struct {
	Token string `json:"token"`
	User  User   `json:"user"`
}

// RegisterRequest represents the user registration payload.
type RegisterRequest struct {
	Username string `json:"username" binding:"required,min=3,max=50"`
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=6"`
	FullName string `json:"full_name" binding:"required"`
	Role     string `json:"role" binding:"required,oneof=admin dispatcher driver data_entry"`
	Phone    string `json:"phone"`
}

// UpdateUserRequest represents the user update payload.
type UpdateUserRequest struct {
	FullName string `json:"full_name"`
	Email    string `json:"email" binding:"omitempty,email"`
	Phone    string `json:"phone"`
	Role     string `json:"role" binding:"omitempty,oneof=admin dispatcher driver data_entry"`
	IsActive *bool  `json:"is_active"`
}

// ---- Repository Interface ----

// UserRepository defines the contract for user data access.
type UserRepository interface {
	Create(ctx context.Context, user *User) error
	FindByID(ctx context.Context, id uuid.UUID) (*User, error)
	FindByUsername(ctx context.Context, username string) (*User, error)
	FindByEmail(ctx context.Context, email string) (*User, error)
	FindAll(ctx context.Context, pagination *PaginationRequest) ([]*User, int64, error)
	Update(ctx context.Context, user *User) error
	UpdateLastLogin(ctx context.Context, id uuid.UUID) error
}

// ---- Usecase Interface ----

// AuthUsecase defines the contract for authentication business logic.
type AuthUsecase interface {
	Login(ctx context.Context, req *LoginRequest) (*LoginResponse, error)
	Register(ctx context.Context, req *RegisterRequest) (*User, error)
	GetProfile(ctx context.Context, userID uuid.UUID) (*User, error)
	GetAllUsers(ctx context.Context, pagination *PaginationRequest) ([]*User, int64, error)
	UpdateUser(ctx context.Context, id uuid.UUID, req *UpdateUserRequest) (*User, error)
}
