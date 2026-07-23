package usecase

import (
	"bytes"
	"context"
	"encoding/csv"
	"fmt"
	"io"
	"strconv"
	"strings"
	"time"

	"backend-delivery/internal/domain"

	"github.com/google/uuid"
	"github.com/xuri/excelize/v2"
)

type importExportUsecase struct {
	btsSiteRepo domain.BtsSiteRepository
	doRepo      domain.DeliveryOrderRepository
	assetRepo   domain.DismantleAssetRepository
	defaultSLA  int
}

// NewImportExportUsecase creates a new ImportExportUsecase implementation.
func NewImportExportUsecase(
	btsSiteRepo domain.BtsSiteRepository,
	doRepo domain.DeliveryOrderRepository,
	assetRepo domain.DismantleAssetRepository,
	defaultSLA int,
) domain.ImportExportUsecase {
	return &importExportUsecase{
		btsSiteRepo: btsSiteRepo,
		doRepo:      doRepo,
		assetRepo:   assetRepo,
		defaultSLA:  defaultSLA,
	}
}

func (u *importExportUsecase) ImportBtsSites(ctx context.Context, reader io.Reader, filename string) (*domain.ImportResult, error) {
	rows, err := readRowsFromFile(reader, filename)
	if err != nil {
		return nil, fmt.Errorf("failed to read import file: %w", err)
	}

	result := &domain.ImportResult{
		TotalRows: len(rows),
	}

	if len(rows) <= 1 {
		return result, nil // Only header or empty
	}

	// Expect columns: site_id, site_name, address, province, city, district, latitude, longitude
	for i, row := range rows[1:] {
		if len(row) < 2 || strings.TrimSpace(row[0]) == "" {
			continue
		}

		siteID := strings.TrimSpace(row[0])
		siteName := strings.TrimSpace(row[1])

		// Skip if site_id already exists
		existing, _ := u.btsSiteRepo.FindBySiteID(ctx, siteID)
		if existing != nil {
			result.Skipped++
			continue
		}

		var address, province, city, district string
		if len(row) > 2 {
			address = strings.TrimSpace(row[2])
		}
		if len(row) > 3 {
			province = strings.TrimSpace(row[3])
		}
		if len(row) > 4 {
			city = strings.TrimSpace(row[4])
		}
		if len(row) > 5 {
			district = strings.TrimSpace(row[5])
		}

		var latPtr, lngPtr *float64
		if len(row) > 6 && row[6] != "" {
			if lat, err := strconv.ParseFloat(strings.TrimSpace(row[6]), 64); err == nil {
				latPtr = &lat
			}
		}
		if len(row) > 7 && row[7] != "" {
			if lng, err := strconv.ParseFloat(strings.TrimSpace(row[7]), 64); err == nil {
				lngPtr = &lng
			}
		}

		site := &domain.BtsSite{
			ID:        uuid.New(),
			SiteID:    siteID,
			SiteName:  siteName,
			Address:   address,
			Province:  province,
			City:      city,
			District:  district,
			Latitude:  latPtr,
			Longitude: lngPtr,
			IsActive:  true,
		}

		if err := u.btsSiteRepo.Create(ctx, site); err != nil {
			result.Errors = append(result.Errors, fmt.Sprintf("Row %d (%s): %v", i+2, siteID, err))
		} else {
			result.Success++
		}
	}

	return result, nil
}

func (u *importExportUsecase) ImportDeliveryOrders(ctx context.Context, reader io.Reader, filename string, createdBy uuid.UUID) (*domain.ImportResult, error) {
	rows, err := readRowsFromFile(reader, filename)
	if err != nil {
		return nil, fmt.Errorf("failed to read import file: %w", err)
	}

	result := &domain.ImportResult{
		TotalRows: len(rows),
	}

	if len(rows) <= 1 {
		return result, nil
	}

	// Expect columns: do_number, bts_site_id_or_code, description, sla_hours, origin_address, destination_address, notes
	for i, row := range rows[1:] {
		if len(row) < 1 || strings.TrimSpace(row[0]) == "" {
			continue
		}

		doNumber := strings.TrimSpace(row[0])

		// Skip if DO already exists
		existing, _ := u.doRepo.FindByDONumber(ctx, doNumber)
		if existing != nil {
			result.Skipped++
			continue
		}

		var siteUUIDPtr *uuid.UUID
		if len(row) > 1 && strings.TrimSpace(row[1]) != "" {
			siteCode := strings.TrimSpace(row[1])
			if parsedUUID, err := uuid.Parse(siteCode); err == nil {
				siteUUIDPtr = &parsedUUID
			} else {
				// Lookup by site_id code (e.g. KAL-BTS-0001)
				if site, _ := u.btsSiteRepo.FindBySiteID(ctx, siteCode); site != nil {
					siteUUIDPtr = &site.ID
				}
			}
		}

		var description, origin, destination, notes string
		if len(row) > 2 {
			description = strings.TrimSpace(row[2])
		}
		slaHours := u.defaultSLA
		if len(row) > 3 && strings.TrimSpace(row[3]) != "" {
			if parsedSLA, err := strconv.Atoi(strings.TrimSpace(row[3])); err == nil && parsedSLA > 0 {
				slaHours = parsedSLA
			}
		}
		if len(row) > 4 {
			origin = strings.TrimSpace(row[4])
		}
		if len(row) > 5 {
			destination = strings.TrimSpace(row[5])
		}
		if len(row) > 6 {
			notes = strings.TrimSpace(row[6])
		}

		now := time.Now()
		deadline := now.Add(time.Duration(slaHours) * time.Hour)

		doEntity := &domain.DeliveryOrder{
			ID:                 uuid.New(),
			DONumber:           doNumber,
			BtsSiteID:          siteUUIDPtr,
			Description:        description,
			Status:             domain.DOStatusPending,
			SLAHours:           slaHours,
			SLADeadline:        &deadline,
			SLAStatus:          domain.SLAStatusGreen,
			OriginAddress:      origin,
			DestinationAddress: destination,
			Notes:              notes,
			CreatedBy:          &createdBy,
		}

		if err := u.doRepo.Create(ctx, doEntity); err != nil {
			result.Errors = append(result.Errors, fmt.Sprintf("Row %d (%s): %v", i+2, doNumber, err))
		} else {
			result.Success++
		}
	}

	return result, nil
}

func (u *importExportUsecase) ExportDeliveryOrders(ctx context.Context) ([]byte, string, error) {
	orders, _, err := u.doRepo.FindAll(ctx, &domain.DOFilterRequest{
		PaginationRequest: domain.PaginationRequest{Page: 1, PerPage: 10000},
	})
	if err != nil {
		return nil, "", fmt.Errorf("failed to fetch delivery orders: %w", err)
	}

	f := excelize.NewFile()
	sheetName := "Delivery Orders"
	f.SetSheetName("Sheet1", sheetName)

	// Headers
	headers := []string{"No", "DO Number", "Status", "SLA Status", "SLA Hours", "SLA Deadline", "Origin", "Destination", "Notes", "Created At"}
	for colIdx, header := range headers {
		cell, _ := excelize.CoordinatesToCellName(colIdx+1, 1)
		_ = f.SetCellValue(sheetName, cell, header)
	}

	// Data rows
	for rowIdx, order := range orders {
		rowNum := rowIdx + 2

		deadlineStr := ""
		if order.SLADeadline != nil {
			deadlineStr = order.SLADeadline.Format("2006-01-02 15:04:05")
		}

		f.SetCellValue(sheetName, fmt.Sprintf("A%d", rowNum), rowIdx+1)
		f.SetCellValue(sheetName, fmt.Sprintf("B%d", rowNum), order.DONumber)
		f.SetCellValue(sheetName, fmt.Sprintf("C%d", rowNum), order.Status)
		f.SetCellValue(sheetName, fmt.Sprintf("D%d", rowNum), order.SLAStatus)
		f.SetCellValue(sheetName, fmt.Sprintf("E%d", rowNum), order.SLAHours)
		f.SetCellValue(sheetName, fmt.Sprintf("F%d", rowNum), deadlineStr)
		f.SetCellValue(sheetName, fmt.Sprintf("G%d", rowNum), order.OriginAddress)
		f.SetCellValue(sheetName, fmt.Sprintf("H%d", rowNum), order.DestinationAddress)
		f.SetCellValue(sheetName, fmt.Sprintf("I%d", rowNum), order.Notes)
		f.SetCellValue(sheetName, fmt.Sprintf("J%d", rowNum), order.CreatedAt.Format("2006-01-02 15:04:05"))
	}

	var buf bytes.Buffer
	if err := f.Write(&buf); err != nil {
		return nil, "", err
	}

	filename := fmt.Sprintf("Laporan_Delivery_Orders_%s.xlsx", time.Now().Format("20060102_150405"))
	return buf.Bytes(), filename, nil
}

func (u *importExportUsecase) ExportDismantleAssets(ctx context.Context) ([]byte, string, error) {
	// For export report, we collect all dismantle assets
	f := excelize.NewFile()
	sheetName := "Barang Dismantle Inbound"
	f.SetSheetName("Sheet1", sheetName)

	headers := []string{"No", "DO Number", "Category", "Item Name", "Serial Number", "Quantity", "Unit", "Condition", "Notes", "Created At"}
	for colIdx, header := range headers {
		cell, _ := excelize.CoordinatesToCellName(colIdx+1, 1)
		_ = f.SetCellValue(sheetName, cell, header)
	}

	// Fetch all DOs first
	orders, _, _ := u.doRepo.FindAll(ctx, &domain.DOFilterRequest{
		PaginationRequest: domain.PaginationRequest{Page: 1, PerPage: 10000},
	})

	rowCounter := 2
	for _, order := range orders {
		assets, _, _ := u.assetRepo.FindByDeliveryOrderID(ctx, order.ID, &domain.PaginationRequest{Page: 1, PerPage: 1000})
		for _, asset := range assets {
			f.SetCellValue(sheetName, fmt.Sprintf("A%d", rowCounter), rowCounter-1)
			f.SetCellValue(sheetName, fmt.Sprintf("B%d", rowCounter), order.DONumber)
			f.SetCellValue(sheetName, fmt.Sprintf("C%d", rowCounter), asset.Category)
			f.SetCellValue(sheetName, fmt.Sprintf("D%d", rowCounter), asset.ItemName)
			f.SetCellValue(sheetName, fmt.Sprintf("E%d", rowCounter), asset.SerialNumber)
			f.SetCellValue(sheetName, fmt.Sprintf("F%d", rowCounter), asset.Quantity)
			f.SetCellValue(sheetName, fmt.Sprintf("G%d", rowCounter), asset.Unit)
			f.SetCellValue(sheetName, fmt.Sprintf("H%d", rowCounter), asset.Condition)
			f.SetCellValue(sheetName, fmt.Sprintf("I%d", rowCounter), asset.Notes)
			f.SetCellValue(sheetName, fmt.Sprintf("J%d", rowCounter), asset.CreatedAt.Format("2006-01-02 15:04:05"))
			rowCounter++
		}
	}

	var buf bytes.Buffer
	if err := f.Write(&buf); err != nil {
		return nil, "", err
	}

	filename := fmt.Sprintf("Laporan_Barang_Dismantle_%s.xlsx", time.Now().Format("20060102_150405"))
	return buf.Bytes(), filename, nil
}

// readRowsFromFile handles both Excel (.xlsx) and CSV files transparently.
func readRowsFromFile(reader io.Reader, filename string) ([][]string, error) {
	buf, err := io.ReadAll(reader)
	if err != nil {
		return nil, err
	}

	if strings.HasSuffix(strings.ToLower(filename), ".xlsx") {
		f, err := excelize.OpenReader(bytes.NewReader(buf))
		if err != nil {
			return nil, fmt.Errorf("invalid excel file: %w", err)
		}
		defer f.Close()

		sheet := f.GetSheetName(0)
		return f.GetRows(sheet)
	}

	// Default CSV reader
	csvReader := csv.NewReader(bytes.NewReader(buf))
	csvReader.LazyQuotes = true
	csvReader.FieldsPerRecord = -1
	return csvReader.ReadAll()
}
