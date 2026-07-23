package usecase

import (
	"context"

	"backend-delivery/internal/domain"
)

type dashboardUsecase struct {
	dashboardRepo domain.DashboardRepository
}

// NewDashboardUsecase creates a new DashboardUsecase implementation.
func NewDashboardUsecase(dashboardRepo domain.DashboardRepository) domain.DashboardUsecase {
	return &dashboardUsecase{dashboardRepo: dashboardRepo}
}

func (u *dashboardUsecase) GetStats(ctx context.Context) (*domain.DashboardStats, error) {
	return u.dashboardRepo.GetStats(ctx)
}
