package handler

import (
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"backend-delivery/pkg/response"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// UploadHandler handles file/media upload HTTP requests.
type UploadHandler struct {
	uploadDir string
}

// NewUploadHandler creates a new UploadHandler.
func NewUploadHandler(uploadDir string) *UploadHandler {
	_ = os.MkdirAll(uploadDir, os.ModePerm)
	return &UploadHandler{uploadDir: uploadDir}
}

// UploadFile handles POST /api/v1/uploads
// Supports single file upload field named "file" or "image".
func (h *UploadHandler) UploadFile(c *gin.Context) {
	file, err := c.FormFile("file")
	if err != nil {
		// Fallback to "image" form key
		file, err = c.FormFile("image")
		if err != nil {
			response.BadRequest(c, "No file uploaded. Use form field 'file' or 'image'", err.Error())
			return
		}
	}

	// Max 10MB file limit
	if file.Size > 10*1024*1024 {
		response.BadRequest(c, "File size exceeds limit of 10MB", nil)
		return
	}

	// Validate extension
	ext := strings.ToLower(filepath.Ext(file.Filename))
	allowedExts := map[string]bool{
		".jpg": true, ".jpeg": true, ".png": true,
		".webp": true, ".pdf": true, ".doc": true, ".docx": true,
	}

	if !allowedExts[ext] {
		response.BadRequest(c, "Unsupported file extension. Allowed: jpg, jpeg, png, webp, pdf, doc, docx", nil)
		return
	}

	// Security Inspection: Validate file Magic Bytes (binary header)
	src, err := file.Open()
	if err != nil {
		response.BadRequest(c, "Failed to open file for security inspection", err.Error())
		return
	}
	defer src.Close()

	buffer := make([]byte, 512)
	n, err := src.Read(buffer)
	if err != nil && n == 0 {
		response.BadRequest(c, "Failed to read file bytes for security inspection", err.Error())
		return
	}

	detectedContentType := http.DetectContentType(buffer[:n])
	allowedMimeTypes := map[string]bool{
		"image/jpeg": true, "image/png": true, "image/webp": true,
		"application/pdf": true, "application/zip": true, "text/plain": true,
		"application/x-zip-compressed": true,
		"application/vnd.openxmlformats-officedocument.wordprocessingml.document": true,
	}

	if !allowedMimeTypes[detectedContentType] {
		response.BadRequest(c, fmt.Sprintf("Security Error: File content type '%s' is not allowed", detectedContentType), nil)
		return
	}

	// Generate unique filename
	timestamp := time.Now().Format("20060102_150405")
	filename := fmt.Sprintf("%s_%s%s", timestamp, uuid.New().String()[:8], ext)
	savePath := filepath.Join(h.uploadDir, filename)

	if err := c.SaveUploadedFile(file, savePath); err != nil {
		response.InternalServerError(c, "Failed to save file: "+err.Error())
		return
	}

	// Generate public relative URL
	fileURL := fmt.Sprintf("/uploads/%s", filename)

	response.Success(c, http.StatusCreated, "File uploaded successfully", gin.H{
		"original_name": file.Filename,
		"saved_name":    filename,
		"size_bytes":    file.Size,
		"extension":     ext,
		"url":           fileURL,
	})
}
