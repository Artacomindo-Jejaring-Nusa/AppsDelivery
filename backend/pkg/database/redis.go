package database

import (
	"context"
	"fmt"
	"log"
	"time"

	"backend-delivery/internal/config"

	"github.com/redis/go-redis/v9"
)

// InitRedis connects to Redis server using application config.
func InitRedis(cfg *config.RedisConfig) (*redis.Client, error) {
	rdb := redis.NewClient(&redis.Options{
		Addr:     cfg.RedisAddr(),
		Password: cfg.Password,
		DB:       cfg.DB,
	})

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := rdb.Ping(ctx).Err(); err != nil {
		return nil, fmt.Errorf("failed to connect to Redis at %s: %w", cfg.RedisAddr(), err)
	}

	log.Printf("Connected to Redis at %s", cfg.RedisAddr())
	return rdb, nil
}
