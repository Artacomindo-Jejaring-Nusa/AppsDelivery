package repository

import (
	"context"
	"fmt"

	"backend-delivery/internal/domain"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type btsSiteRepository struct {
	db *pgxpool.Pool
}

// NewBtsSiteRepository creates a new BtsSiteRepository implementation.
func NewBtsSiteRepository(db *pgxpool.Pool) domain.BtsSiteRepository {
	return &btsSiteRepository{db: db}
}

func (r *btsSiteRepository) Create(ctx context.Context, site *domain.BtsSite) error {
	query := `
		INSERT INTO bts_sites (id, site_id, site_name, address, province, city, district, latitude, longitude)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		RETURNING created_at, updated_at`

	if site.ID == uuid.Nil {
		site.ID = uuid.New()
	}

	return r.db.QueryRow(ctx, query,
		site.ID, site.SiteID, site.SiteName, site.Address,
		site.Province, site.City, site.District, site.Latitude, site.Longitude,
	).Scan(&site.CreatedAt, &site.UpdatedAt)
}

func (r *btsSiteRepository) FindByID(ctx context.Context, id uuid.UUID) (*domain.BtsSite, error) {
	query := `
		SELECT id, site_id, site_name, COALESCE(address, ''), COALESCE(province, ''), COALESCE(city, ''), COALESCE(district, ''), COALESCE(latitude, 0), COALESCE(longitude, 0), is_active, created_at, updated_at
		FROM bts_sites WHERE id = $1`

	site := &domain.BtsSite{}
	err := r.db.QueryRow(ctx, query, id).Scan(
		&site.ID, &site.SiteID, &site.SiteName, &site.Address,
		&site.Province, &site.City, &site.District,
		&site.Latitude, &site.Longitude, &site.IsActive,
		&site.CreatedAt, &site.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return site, nil
}

func (r *btsSiteRepository) FindBySiteID(ctx context.Context, siteID string) (*domain.BtsSite, error) {
	query := `
		SELECT id, site_id, site_name, COALESCE(address, ''), COALESCE(province, ''), COALESCE(city, ''), COALESCE(district, ''), COALESCE(latitude, 0), COALESCE(longitude, 0), is_active, created_at, updated_at
		FROM bts_sites WHERE site_id = $1`

	site := &domain.BtsSite{}
	err := r.db.QueryRow(ctx, query, siteID).Scan(
		&site.ID, &site.SiteID, &site.SiteName, &site.Address,
		&site.Province, &site.City, &site.District,
		&site.Latitude, &site.Longitude, &site.IsActive,
		&site.CreatedAt, &site.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return site, nil
}

func (r *btsSiteRepository) FindAll(ctx context.Context, pagination *domain.PaginationRequest) ([]*domain.BtsSite, int64, error) {
	pagination.SetDefaults()

	countQuery := `SELECT COUNT(*) FROM bts_sites WHERE 1=1`
	args := []interface{}{}
	argIndex := 1

	if pagination.Search != "" {
		countQuery += fmt.Sprintf(` AND (site_id ILIKE $%d OR site_name ILIKE $%d OR city ILIKE $%d OR province ILIKE $%d)`,
			argIndex, argIndex, argIndex, argIndex)
		args = append(args, "%"+pagination.Search+"%")
		argIndex++
	}

	var total int64
	if err := r.db.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	dataQuery := `
		SELECT id, site_id, site_name, COALESCE(address, ''), COALESCE(province, ''), COALESCE(city, ''), COALESCE(district, ''), COALESCE(latitude, 0), COALESCE(longitude, 0), is_active, created_at, updated_at
		FROM bts_sites WHERE 1=1`

	dataArgs := []interface{}{}
	dataArgIndex := 1

	if pagination.Search != "" {
		dataQuery += fmt.Sprintf(` AND (site_id ILIKE $%d OR site_name ILIKE $%d OR city ILIKE $%d OR province ILIKE $%d)`,
			dataArgIndex, dataArgIndex, dataArgIndex, dataArgIndex)
		dataArgs = append(dataArgs, "%"+pagination.Search+"%")
		dataArgIndex++
	}

	dataQuery += fmt.Sprintf(` ORDER BY %s %s LIMIT $%d OFFSET $%d`,
		sanitizeSortColumn(pagination.SortBy, "created_at"),
		sanitizeOrder(pagination.Order),
		dataArgIndex, dataArgIndex+1)
	dataArgs = append(dataArgs, pagination.PerPage, pagination.Offset())

	rows, err := r.db.Query(ctx, dataQuery, dataArgs...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var sites []*domain.BtsSite
	for rows.Next() {
		site := &domain.BtsSite{}
		if err := rows.Scan(
			&site.ID, &site.SiteID, &site.SiteName, &site.Address,
			&site.Province, &site.City, &site.District,
			&site.Latitude, &site.Longitude, &site.IsActive,
			&site.CreatedAt, &site.UpdatedAt,
		); err != nil {
			return nil, 0, err
		}
		sites = append(sites, site)
	}

	return sites, total, nil
}

func (r *btsSiteRepository) Update(ctx context.Context, site *domain.BtsSite) error {
	query := `
		UPDATE bts_sites
		SET site_name = $1, address = $2, province = $3, city = $4, district = $5, latitude = $6, longitude = $7, is_active = $8
		WHERE id = $9
		RETURNING updated_at`

	return r.db.QueryRow(ctx, query,
		site.SiteName, site.Address, site.Province, site.City,
		site.District, site.Latitude, site.Longitude, site.IsActive, site.ID,
	).Scan(&site.UpdatedAt)
}

func (r *btsSiteRepository) Delete(ctx context.Context, id uuid.UUID) error {
	query := `UPDATE bts_sites SET is_active = false WHERE id = $1`
	_, err := r.db.Exec(ctx, query, id)
	return err
}
