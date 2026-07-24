package middleware

import (
	"context"
	"fmt"
	"net/http"
	"time"

	"backend-delivery/pkg/response"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
)

// RateLimiter returns a Gin middleware that limits requests per IP using Redis.
func RateLimiter(rdb *redis.Client, limit int, window time.Duration, keyPrefix string) gin.HandlerFunc {
	return func(c *gin.Context) {
		if rdb == nil {
			// If Redis is disabled/unavailable, bypass rate limiting gracefully
			c.Next()
			return
		}

		ip := c.ClientIP()
		key := fmt.Sprintf("%s:%s", keyPrefix, ip)
		ctx := context.Background()

		// Increment count for IP
		count, err := rdb.Incr(ctx, key).Result()
		if err != nil {
			// Fallback on Redis error
			c.Next()
			return
		}

		// Set expiration on first hit
		if count == 1 {
			rdb.Expire(ctx, key, window)
		}

		// Check limit exceeded
		if count > int64(limit) {
			ttl, _ := rdb.TTL(ctx, key).Result()
			c.Header("Retry-After", fmt.Sprintf("%.0f", ttl.Seconds()))
			response.Error(c, http.StatusTooManyRequests, "Too many requests. Please try again later.", nil)
			c.Abort()
			return
		}

		c.Next()
	}
}
