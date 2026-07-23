package repository

import (
	"context"
	"fmt"
	"time"

	"backend-delivery/internal/domain"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type userRepository struct {
	db *pgxpool.Pool
}

// NewUserRepository creates a new UserRepository implementation.
func NewUserRepository(db *pgxpool.Pool) domain.UserRepository {
	return &userRepository{db: db}
}

func (r *userRepository) Create(ctx context.Context, user *domain.User) error {
	query := `
		INSERT INTO users (id, username, email, password_hash, full_name, role, phone, is_active)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING created_at, updated_at`

	if user.ID == uuid.Nil {
		user.ID = uuid.New()
	}

	return r.db.QueryRow(ctx, query,
		user.ID, user.Username, user.Email, user.PasswordHash,
		user.FullName, user.Role, user.Phone, user.IsActive,
	).Scan(&user.CreatedAt, &user.UpdatedAt)
}

func (r *userRepository) FindByID(ctx context.Context, id uuid.UUID) (*domain.User, error) {
	query := `
		SELECT id, username, email, password_hash, full_name, role, phone, is_active, last_login_at, created_at, updated_at
		FROM users WHERE id = $1`

	user := &domain.User{}
	err := r.db.QueryRow(ctx, query, id).Scan(
		&user.ID, &user.Username, &user.Email, &user.PasswordHash,
		&user.FullName, &user.Role, &user.Phone, &user.IsActive,
		&user.LastLoginAt, &user.CreatedAt, &user.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return user, nil
}

func (r *userRepository) FindByUsername(ctx context.Context, username string) (*domain.User, error) {
	query := `
		SELECT id, username, email, password_hash, full_name, role, phone, is_active, last_login_at, created_at, updated_at
		FROM users WHERE username = $1`

	user := &domain.User{}
	err := r.db.QueryRow(ctx, query, username).Scan(
		&user.ID, &user.Username, &user.Email, &user.PasswordHash,
		&user.FullName, &user.Role, &user.Phone, &user.IsActive,
		&user.LastLoginAt, &user.CreatedAt, &user.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return user, nil
}

func (r *userRepository) FindByEmail(ctx context.Context, email string) (*domain.User, error) {
	query := `
		SELECT id, username, email, password_hash, full_name, role, phone, is_active, last_login_at, created_at, updated_at
		FROM users WHERE email = $1`

	user := &domain.User{}
	err := r.db.QueryRow(ctx, query, email).Scan(
		&user.ID, &user.Username, &user.Email, &user.PasswordHash,
		&user.FullName, &user.Role, &user.Phone, &user.IsActive,
		&user.LastLoginAt, &user.CreatedAt, &user.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return user, nil
}

func (r *userRepository) FindAll(ctx context.Context, pagination *domain.PaginationRequest) ([]*domain.User, int64, error) {
	pagination.SetDefaults()

	// Count total
	countQuery := `SELECT COUNT(*) FROM users WHERE 1=1`
	args := []interface{}{}
	argIndex := 1

	if pagination.Search != "" {
		countQuery += fmt.Sprintf(` AND (username ILIKE $%d OR full_name ILIKE $%d OR email ILIKE $%d)`, argIndex, argIndex, argIndex)
		args = append(args, "%"+pagination.Search+"%")
		argIndex++
	}

	var total int64
	err := r.db.QueryRow(ctx, countQuery, args...).Scan(&total)
	if err != nil {
		return nil, 0, err
	}

	// Fetch data
	dataQuery := `
		SELECT id, username, email, full_name, role, phone, is_active, last_login_at, created_at, updated_at
		FROM users WHERE 1=1`

	dataArgs := []interface{}{}
	dataArgIndex := 1

	if pagination.Search != "" {
		dataQuery += fmt.Sprintf(` AND (username ILIKE $%d OR full_name ILIKE $%d OR email ILIKE $%d)`, dataArgIndex, dataArgIndex, dataArgIndex)
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

	var users []*domain.User
	for rows.Next() {
		user := &domain.User{}
		err := rows.Scan(
			&user.ID, &user.Username, &user.Email, &user.FullName,
			&user.Role, &user.Phone, &user.IsActive, &user.LastLoginAt,
			&user.CreatedAt, &user.UpdatedAt,
		)
		if err != nil {
			return nil, 0, err
		}
		users = append(users, user)
	}

	return users, total, nil
}

func (r *userRepository) Update(ctx context.Context, user *domain.User) error {
	query := `
		UPDATE users
		SET full_name = $1, email = $2, phone = $3, role = $4, is_active = $5
		WHERE id = $6
		RETURNING updated_at`

	return r.db.QueryRow(ctx, query,
		user.FullName, user.Email, user.Phone, user.Role, user.IsActive, user.ID,
	).Scan(&user.UpdatedAt)
}

func (r *userRepository) UpdateLastLogin(ctx context.Context, id uuid.UUID) error {
	query := `UPDATE users SET last_login_at = $1 WHERE id = $2`
	_, err := r.db.Exec(ctx, query, time.Now(), id)
	return err
}

// ---- Helper functions ----

// sanitizeSortColumn ensures only valid column names are used in ORDER BY.
func sanitizeSortColumn(col, defaultCol string) string {
	allowed := map[string]bool{
		"created_at": true, "updated_at": true, "username": true,
		"full_name": true, "email": true, "role": true,
		"site_id": true, "site_name": true, "province": true, "city": true,
		"do_number": true, "status": true, "sla_status": true, "sla_deadline": true,
		"manifest_number": true, "phone": true, "vehicle_plate": true,
		"category": true, "item_name": true, "serial_number": true, "quantity": true,
	}
	if allowed[col] {
		return col
	}
	return defaultCol
}

// sanitizeOrder ensures only "asc" or "desc" are used.
func sanitizeOrder(order string) string {
	if order == "asc" || order == "ASC" {
		return "ASC"
	}
	return "DESC"
}
