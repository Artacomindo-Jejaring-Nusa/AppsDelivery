package usecase

import (
	"context"
	"errors"

	"backend-delivery/internal/domain"
	jwtPkg "backend-delivery/pkg/jwt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"golang.org/x/crypto/bcrypt"
)

type authUsecase struct {
	userRepo   domain.UserRepository
	jwtManager *jwtPkg.JWTManager
}

// NewAuthUsecase creates a new AuthUsecase implementation.
func NewAuthUsecase(userRepo domain.UserRepository, jwtManager *jwtPkg.JWTManager) domain.AuthUsecase {
	return &authUsecase{
		userRepo:   userRepo,
		jwtManager: jwtManager,
	}
}

func (u *authUsecase) Login(ctx context.Context, req *domain.LoginRequest) (*domain.LoginResponse, error) {
	user, err := u.userRepo.FindByUsername(ctx, req.Username)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errors.New("invalid username or password")
		}
		return nil, err
	}

	if !user.IsActive {
		return nil, errors.New("user account is deactivated")
	}

	// Compare password
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		return nil, errors.New("invalid username or password")
	}

	// Generate JWT token
	token, err := u.jwtManager.GenerateToken(user.ID, user.Username, user.Role)
	if err != nil {
		return nil, errors.New("failed to generate token")
	}

	// Update last login
	_ = u.userRepo.UpdateLastLogin(ctx, user.ID)

	return &domain.LoginResponse{
		Token: token,
		User:  *user,
	}, nil
}

func (u *authUsecase) Register(ctx context.Context, req *domain.RegisterRequest) (*domain.User, error) {
	// Check if username already exists
	existing, _ := u.userRepo.FindByUsername(ctx, req.Username)
	if existing != nil {
		return nil, errors.New("username already exists")
	}

	// Check if email already exists
	existing, _ = u.userRepo.FindByEmail(ctx, req.Email)
	if existing != nil {
		return nil, errors.New("email already exists")
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, errors.New("failed to hash password")
	}

	user := &domain.User{
		ID:           uuid.New(),
		Username:     req.Username,
		Email:        req.Email,
		PasswordHash: string(hashedPassword),
		FullName:     req.FullName,
		Role:         req.Role,
		Phone:        req.Phone,
		IsActive:     true,
	}

	if err := u.userRepo.Create(ctx, user); err != nil {
		return nil, err
	}

	return user, nil
}

func (u *authUsecase) GetProfile(ctx context.Context, userID uuid.UUID) (*domain.User, error) {
	user, err := u.userRepo.FindByID(ctx, userID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errors.New("user not found")
		}
		return nil, err
	}
	return user, nil
}

func (u *authUsecase) GetAllUsers(ctx context.Context, pagination *domain.PaginationRequest) ([]*domain.User, int64, error) {
	return u.userRepo.FindAll(ctx, pagination)
}

func (u *authUsecase) UpdateUser(ctx context.Context, id uuid.UUID, req *domain.UpdateUserRequest) (*domain.User, error) {
	user, err := u.userRepo.FindByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errors.New("user not found")
		}
		return nil, err
	}

	if req.FullName != "" {
		user.FullName = req.FullName
	}
	if req.Email != "" {
		user.Email = req.Email
	}
	if req.Phone != "" {
		user.Phone = req.Phone
	}
	if req.Role != "" {
		user.Role = req.Role
	}
	if req.IsActive != nil {
		user.IsActive = *req.IsActive
	}

	if err := u.userRepo.Update(ctx, user); err != nil {
		return nil, err
	}

	return user, nil
}
