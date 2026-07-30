package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"

	"backend-delivery/internal/config"
	"backend-delivery/pkg/database"
)

type BTSSiteItem struct {
	ID       string   `json:"id"`
	SiteID   string   `json:"site_id"`
	SiteName string   `json:"site_name"`
	Lat      *float64 `json:"lat"`
	Lng      *float64 `json:"lng"`
	City     string   `json:"city"`
	Tech     string   `json:"tech"`
	Status   string   `json:"status"`
	IsActive bool     `json:"is_active"`
}

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	db, err := database.NewPostgresConnection(&cfg.Database)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	jsonPath := "../frontend/src/data/zte_bts_sites.json"
	data, err := os.ReadFile(jsonPath)
	if err != nil {
		log.Fatalf("Failed to read JSON data: %v", err)
	}

	var items []BTSSiteItem
	if err := json.Unmarshal(data, &items); err != nil {
		log.Fatalf("Failed to parse JSON: %v", err)
	}

	fmt.Printf("Loaded %d ZTE BTS sites from JSON. Seeding database...\n", len(items))

	inserted := 0
	ctx := context.Background()
	for _, s := range items {
		query := `
			INSERT INTO bts_sites (site_id, site_name, address, province, city, district, latitude, longitude, is_active)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
			ON CONFLICT (site_id) DO UPDATE SET
				site_name = EXCLUDED.site_name,
				latitude = EXCLUDED.latitude,
				longitude = EXCLUDED.longitude,
				updated_at = NOW()
		`
		_, err := db.Exec(ctx, query, s.SiteID, s.SiteName, s.Tech, "Kalimantan", s.City, "", s.Lat, s.Lng, s.IsActive)
		if err == nil {
			inserted++
		}
	}

	fmt.Printf("Database seeding complete! Total inserted/updated: %d sites.\n", inserted)
}
