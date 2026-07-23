# ============================================
# Stage 1: Build
# ============================================
FROM golang:1.23-alpine AS builder

RUN apk add --no-cache git ca-certificates tzdata

WORKDIR /build

# Copy go.mod and go.sum first for layer caching
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build binary
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 \
    go build -ldflags="-w -s" -o /build/api ./cmd/api

# ============================================
# Stage 2: Run
# ============================================
FROM alpine:3.20

RUN apk add --no-cache ca-certificates tzdata

# Set timezone
ENV TZ=Asia/Jakarta

WORKDIR /app

# Copy binary from builder
COPY --from=builder /build/api .

# Copy migrations
COPY --from=builder /build/migrations ./migrations

# Create uploads directory
RUN mkdir -p /app/uploads/barcodes

EXPOSE 8080

ENTRYPOINT ["./api"]
