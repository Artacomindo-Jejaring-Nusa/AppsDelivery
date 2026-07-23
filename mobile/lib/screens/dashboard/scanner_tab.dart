import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';

import '../../core/theme/colors.dart';
import '../../models/delivery_order_model.dart';
import '../../providers/manifest_provider.dart';
import '../../providers/sync_provider.dart';
import '../task/verification_screen.dart';

class ScannerTab extends StatefulWidget {
  const ScannerTab({super.key});

  @override
  State<ScannerTab> createState() => _ScannerTabState();
}

class _ScannerTabState extends State<ScannerTab> {
  DeliveryOrderModel? _selectedDO;
  final List<String> _scannedSerialNumbers = [];

  void _handleSimulateScan(String mockSn) {
    if (_scannedSerialNumbers.contains(mockSn)) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text("Serial Number $mockSn already scanned"),
          backgroundColor: StitchColors.slaYellow,
        ),
      );
      return;
    }

    setState(() {
      _scannedSerialNumbers.insert(0, mockSn);
    });

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text("Scanned SN: $mockSn")),
    );
  }

  void _finishScanning(DeliveryOrderModel order) {
    if (_scannedSerialNumbers.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text("Please scan at least one barcode to proceed"),
          backgroundColor: StitchColors.error,
        ),
      );
      return;
    }

    // Open Verification Screen
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => VerificationScreen(
          order: order,
          manifestId: Provider.of<ManifestProvider>(context, listen: false).activeManifest!.id,
        ),
      ),
    ).then((_) {
      // Clear scans on success
      setState(() {
        _scannedSerialNumbers.clear();
        _selectedDO = null;
      });
    });
  }

  @override
  Widget build(BuildContext context) {
    final manifestProv = Provider.of<ManifestProvider>(context);
    final syncProv = Provider.of<SyncProvider>(context);

    final manifest = manifestProv.activeManifest;

    // Filter DOs that are ready for scanning (in_transit status)
    final scanReadyDOs = manifest?.deliveryOrders
            .where((order) => order.status == 'in_transit' || order.status == 'assigned')
            .toList() ??
        [];

    if (manifest == null) {
      return const Center(
        child: Padding(
          padding: EdgeInsets.all(32.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.qr_code_scanner, color: StitchColors.outline, size: 64),
              SizedBox(height: 16),
              Text(
                "Scanner Disabled",
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
              SizedBox(height: 8),
              Text(
                "You must have an active assigned manifest to use the scanner.",
                style: TextStyle(color: StitchColors.secondary, fontSize: 13),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      );
    }

    // Auto-select first DO if none selected
    if (_selectedDO == null && scanReadyDOs.isNotEmpty) {
      _selectedDO = scanReadyDOs.first;
    }

    final activeDO = _selectedDO;

    if (activeDO == null) {
      return const Center(
        child: Padding(
          padding: EdgeInsets.all(32.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.check_circle_outline, color: StitchColors.slaGreen, size: 64),
              SizedBox(height: 16),
              Text(
                "All Tasks Complete",
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
              SizedBox(height: 8),
              Text(
                "All shipments in this manifest have been verified and delivered.",
                style: TextStyle(color: StitchColors.secondary, fontSize: 13),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      );
    }

    // Simulated dismantle items count: total 3 per DO for testing progress
    const int totalExpectedScans = 3;
    final int currentScansCount = _scannedSerialNumbers.length;
    final double scanProgress = currentScansCount / totalExpectedScans;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // 1. DO selection dropdown & indicators
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    "DELIVERY ORDER",
                    style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: StitchColors.onSurfaceVariant),
                  ),
                  DropdownButton<DeliveryOrderModel>(
                    value: activeDO,
                    onChanged: (newDO) {
                      setState(() {
                        _selectedDO = newDO;
                        _scannedSerialNumbers.clear();
                      });
                    },
                    items: scanReadyDOs.map<DropdownMenuItem<DeliveryOrderModel>>((order) {
                      return DropdownMenuItem<DeliveryOrderModel>(
                        value: order,
                        child: Text(
                          order.doNumber,
                          style: const TextStyle(fontWeight: FontWeight.bold, color: StitchColors.primary),
                        ),
                      );
                    }).toList(),
                  ),
                ],
              ),
              Row(
                children: [
                  Chip(
                    label: Text(
                      syncProv.isOnline ? "SYNCED" : "OFFLINE",
                      style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: StitchColors.primary),
                    ),
                    backgroundColor: StitchColors.secondaryContainer,
                    visualDensity: VisualDensity.compact,
                  ),
                  const SizedBox(width: 8),
                  Chip(
                    label: const Text(
                      "IN PROGRESS",
                      style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.white),
                    ),
                    backgroundColor: StitchColors.primaryContainer,
                    visualDensity: VisualDensity.compact,
                  ),
                ],
              )
            ],
          ),
          const SizedBox(height: 16),

          // 2. Scanning Progress Bar
          Container(
            padding: const EdgeInsets.all(16.0),
            decoration: BoxDecoration(
              color: StitchColors.surfaceContainerLowest,
              border: Border.all(color: StitchColors.outlineVariant),
              borderRadius: BorderRadius.circular(12.0),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      "Scanning Progress",
                      style: TextStyle(fontWeight: FontWeight.bold),
                    ),
                    Text(
                      "$currentScansCount / $totalExpectedScans",
                      style: const TextStyle(fontWeight: FontWeight.bold, color: StitchColors.primary),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                ClipRRect(
                  borderRadius: BorderRadius.circular(4.0),
                  child: LinearProgressIndicator(
                    value: scanProgress.clamp(0.0, 1.0),
                    minHeight: 8,
                    backgroundColor: StitchColors.surfaceContainerHigh,
                    color: StitchColors.primary,
                  ),
                )
              ],
            ),
          ),
          const SizedBox(height: 20),

          // 3. Mock Viewfinder frame
          GestureDetector(
            onTap: () {
              // Trigger a mock scan on click
              final mockSns = ["SN-ANT-20260901", "SN-RRU-5524310", "SN-BAT-0094382"];
              if (currentScansCount < totalExpectedScans) {
                _handleSimulateScan(mockSns[currentScansCount]);
              } else {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text("All items for this DO have been scanned!")),
                );
              }
            },
            child: Container(
              height: 200,
              width: double.infinity,
              decoration: BoxDecoration(
                color: Colors.black87,
                borderRadius: BorderRadius.circular(12.0),
                border: Border.all(color: StitchColors.outlineVariant),
              ),
              child: Stack(
                alignment: Alignment.center,
                children: [
                  // Laser scan line overlay
                  Container(
                    width: double.infinity,
                    height: 2,
                    color: Colors.redAccent,
                  ),
                  const Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.qr_code_scanner, color: Colors.white, size: 48),
                      SizedBox(height: 12),
                      Text(
                        "TAP TO SIMULATE BARCODE SCAN",
                        style: TextStyle(color: Colors.white70, fontWeight: FontWeight.bold, fontSize: 13),
                      ),
                      SizedBox(height: 4),
                      Text(
                        "Simulates camera sticker scanner on emulator",
                        style: TextStyle(color: Colors.white54, fontSize: 11),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 20),

          // 4. Recent Scans list
          const Text(
            "RECENT SCANS",
            style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: StitchColors.onSurfaceVariant),
          ),
          const SizedBox(height: 8),
          if (_scannedSerialNumbers.isEmpty)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: StitchColors.surfaceContainerLowest,
                border: Border.all(color: StitchColors.outlineVariant),
                borderRadius: BorderRadius.circular(8.0),
              ),
              child: const Center(
                child: Text(
                  "No barcodes scanned yet",
                  style: TextStyle(color: StitchColors.secondary, fontSize: 13),
                ),
              ),
            )
          else
            ListView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: _scannedSerialNumbers.length,
              itemBuilder: (context, index) {
                final sn = _scannedSerialNumbers[index];
                final now = DateFormat('hh:mm a').format(DateTime.now());

                return Container(
                  margin: const EdgeInsets.only(bottom: 8.0),
                  padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 12.0),
                  decoration: BoxDecoration(
                    color: StitchColors.surfaceContainerLowest,
                    border: Border.all(color: StitchColors.outlineVariant),
                    borderRadius: BorderRadius.circular(8.0),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          const Icon(Icons.check_circle, color: StitchColors.slaGreen, size: 18),
                          const SizedBox(width: 8),
                          Text(
                            "SN: $sn",
                            style: const TextStyle(fontWeight: FontWeight.bold, fontFamily: 'JetBrains Mono'),
                          ),
                        ],
                      ),
                      Text(
                        now,
                        style: const TextStyle(color: StitchColors.secondary, fontSize: 11),
                      ),
                    ],
                  ),
                );
              },
            ),
          const SizedBox(height: 24),

          // 5. Done Button
          SizedBox(
            width: double.infinity,
            height: 56,
            child: ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: StitchColors.primary,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8.0)),
              ),
              onPressed: () => _finishScanning(activeDO),
              child: const Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text("DONE", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                  SizedBox(width: 8),
                  Icon(Icons.check, size: 18),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
