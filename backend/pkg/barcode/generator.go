package barcode

import (
	"fmt"
	"image/png"
	"os"
	"path/filepath"

	barcodeLib "github.com/boombuler/barcode"
	"github.com/boombuler/barcode/qr"
)

// Generator handles QR Code / Barcode 2D generation.
type Generator struct {
	imageDir  string
	imageSize int
}

// NewGenerator creates a new Barcode Generator with the given output dir and size.
func NewGenerator(imageDir string, imageSize int) *Generator {
	// Ensure directory exists
	_ = os.MkdirAll(imageDir, os.ModePerm)

	return &Generator{
		imageDir:  imageDir,
		imageSize: imageSize,
	}
}

// GenerateQRCode generates a QR Code PNG image and returns the file path.
// barcodeData is the string content encoded into the QR code.
// filename is the name of the output PNG file (without extension).
func (g *Generator) GenerateQRCode(barcodeData, filename string) (string, error) {
	// Create QR code
	qrCode, err := qr.Encode(barcodeData, qr.M, qr.Auto)
	if err != nil {
		return "", fmt.Errorf("failed to encode QR code: %w", err)
	}

	// Scale to desired size
	qrCode, err = barcodeLib.Scale(qrCode, g.imageSize, g.imageSize)
	if err != nil {
		return "", fmt.Errorf("failed to scale QR code: %w", err)
	}

	// Create output file
	outputPath := filepath.Join(g.imageDir, filename+".png")
	file, err := os.Create(outputPath)
	if err != nil {
		return "", fmt.Errorf("failed to create QR code file: %w", err)
	}
	defer file.Close()

	// Encode as PNG
	if err := png.Encode(file, qrCode); err != nil {
		return "", fmt.Errorf("failed to encode PNG: %w", err)
	}

	return outputPath, nil
}
