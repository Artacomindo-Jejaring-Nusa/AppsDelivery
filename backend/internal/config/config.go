package config

import (
	"fmt"
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

// Config holds all application configuration.
type Config struct {
	App      AppConfig
	Database DatabaseConfig
	Redis    RedisConfig
	JWT      JWTConfig
	SLA      SLAConfig
	Barcode  BarcodeConfig
}

// AppConfig holds application-level settings.
type AppConfig struct {
	Env  string
	Port string
	Name string
}

// DatabaseConfig holds PostgreSQL connection settings.
type DatabaseConfig struct {
	Host            string
	Port            string
	User            string
	Password        string
	DBName          string
	SSLMode         string
	MaxOpenConns    int
	MaxIdleConns    int
	ConnMaxLifetime int // in seconds
}

// RedisConfig holds Redis connection settings.
type RedisConfig struct {
	Host     string
	Port     string
	Password string
	DB       int
}

// JWTConfig holds JWT authentication settings.
type JWTConfig struct {
	Secret      string
	ExpiryHours int
}

// SLAConfig holds SLA Engine settings.
type SLAConfig struct {
	DefaultHours int
	WarningHours int
	CronInterval string
}

// BarcodeConfig holds barcode generator settings.
type BarcodeConfig struct {
	ImageDir  string
	ImageSize int
}

// DSN returns the PostgreSQL connection string.
func (d *DatabaseConfig) DSN() string {
	return fmt.Sprintf(
		"postgres://%s:%s@%s:%s/%s?sslmode=%s",
		d.User, d.Password, d.Host, d.Port, d.DBName, d.SSLMode,
	)
}

// RedisAddr returns the Redis connection address.
func (r *RedisConfig) RedisAddr() string {
	return fmt.Sprintf("%s:%s", r.Host, r.Port)
}

// Load reads the .env file and returns a populated Config struct.
func Load() (*Config, error) {
	// Load .env file (ignore error if file doesn't exist — env vars may be set directly)
	_ = godotenv.Load()

	cfg := &Config{
		App: AppConfig{
			Env:  getEnv("APP_ENV", "development"),
			Port: getEnv("APP_PORT", "8080"),
			Name: getEnv("APP_NAME", "delivery-api"),
		},
		Database: DatabaseConfig{
			Host:            getEnv("DB_HOST", "localhost"),
			Port:            getEnv("DB_PORT", "5432"),
			User:            getEnv("DB_USER", "delivery_user"),
			Password:        getEnv("DB_PASSWORD", "delivery_secret_2026"),
			DBName:          getEnv("DB_NAME", "delivery_db"),
			SSLMode:         getEnv("DB_SSLMODE", "disable"),
			MaxOpenConns:    getEnvInt("DB_MAX_OPEN_CONNS", 25),
			MaxIdleConns:    getEnvInt("DB_MAX_IDLE_CONNS", 10),
			ConnMaxLifetime: getEnvInt("DB_CONN_MAX_LIFETIME", 300),
		},
		Redis: RedisConfig{
			Host:     getEnv("REDIS_HOST", "localhost"),
			Port:     getEnv("REDIS_PORT", "6379"),
			Password: getEnv("REDIS_PASSWORD", ""),
			DB:       getEnvInt("REDIS_DB", 0),
		},
		JWT: JWTConfig{
			Secret:      getEnv("JWT_SECRET", "change-me-in-production"),
			ExpiryHours: getEnvInt("JWT_EXPIRY_HOURS", 24),
		},
		SLA: SLAConfig{
			DefaultHours: getEnvInt("SLA_DEFAULT_HOURS", 72),
			WarningHours: getEnvInt("SLA_WARNING_HOURS", 24),
			CronInterval: getEnv("SLA_CRON_INTERVAL", "*/5 * * * *"),
		},
		Barcode: BarcodeConfig{
			ImageDir:  getEnv("BARCODE_IMAGE_DIR", "./uploads/barcodes"),
			ImageSize: getEnvInt("BARCODE_IMAGE_SIZE", 256),
		},
	}

	return cfg, nil
}

// getEnv retrieves an environment variable or returns a default value.
func getEnv(key, defaultValue string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return defaultValue
}

// getEnvInt retrieves an environment variable as an integer or returns a default.
func getEnvInt(key string, defaultValue int) int {
	if value, exists := os.LookupEnv(key); exists {
		if intVal, err := strconv.Atoi(value); err == nil {
			return intVal
		}
	}
	return defaultValue
}
