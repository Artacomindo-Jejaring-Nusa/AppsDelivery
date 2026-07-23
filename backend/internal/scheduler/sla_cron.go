package scheduler

import (
	"context"
	"log"

	"backend-delivery/internal/domain"

	"github.com/robfig/cron/v3"
)

// SLACron manages the background SLA evaluation job.
type SLACron struct {
	cron      *cron.Cron
	slaEngine domain.SLAEngineUsecase
	interval  string
}

// NewSLACron creates a new SLACron scheduler.
func NewSLACron(slaEngine domain.SLAEngineUsecase, cronInterval string) *SLACron {
	return &SLACron{
		cron:      cron.New(),
		slaEngine: slaEngine,
		interval:  cronInterval,
	}
}

// Start begins the SLA evaluation cron job.
func (s *SLACron) Start() error {
	_, err := s.cron.AddFunc(s.interval, func() {
		log.Println("[SLA Cron] Starting SLA evaluation...")
		ctx := context.Background()
		if err := s.slaEngine.EvaluateAll(ctx); err != nil {
			log.Printf("[SLA Cron] Error during evaluation: %v", err)
		}
	})
	if err != nil {
		return err
	}

	s.cron.Start()
	log.Printf("[SLA Cron] Started with interval: %s", s.interval)
	return nil
}

// Stop gracefully stops the cron scheduler.
func (s *SLACron) Stop() {
	s.cron.Stop()
	log.Println("[SLA Cron] Stopped")
}
