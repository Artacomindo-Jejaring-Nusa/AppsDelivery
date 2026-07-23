package middleware

import (
	"net/http"
	"strings"

	jwtPkg "backend-delivery/pkg/jwt"
	"backend-delivery/pkg/response"

	"github.com/gin-gonic/gin"
)

// AuthMiddleware validates JWT token and sets user info in context.
func AuthMiddleware(jwtManager *jwtPkg.JWTManager) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			response.Unauthorized(c, "Authorization header is required")
			c.Abort()
			return
		}

		// Expect "Bearer <token>"
		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
			response.Unauthorized(c, "Invalid authorization header format")
			c.Abort()
			return
		}

		claims, err := jwtManager.ValidateToken(parts[1])
		if err != nil {
			response.Unauthorized(c, "Invalid or expired token")
			c.Abort()
			return
		}

		// Set user info in context
		c.Set("user_id", claims.UserID)
		c.Set("username", claims.Username)
		c.Set("role", claims.Role)

		c.Next()
	}
}

// RoleMiddleware restricts access to specific roles.
func RoleMiddleware(allowedRoles ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		role, exists := c.Get("role")
		if !exists {
			response.Unauthorized(c, "Role not found in token")
			c.Abort()
			return
		}

		roleStr, ok := role.(string)
		if !ok {
			response.Unauthorized(c, "Invalid role type")
			c.Abort()
			return
		}

		for _, allowed := range allowedRoles {
			if roleStr == allowed {
				c.Next()
				return
			}
		}

		response.Error(c, http.StatusForbidden, "You do not have permission to access this resource", nil)
		c.Abort()
	}
}
