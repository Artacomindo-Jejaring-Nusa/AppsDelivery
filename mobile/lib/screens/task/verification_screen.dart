import 'dart:io';
import 'dart:ui' as ui;
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:image_picker/image_picker.dart';
import 'package:signature/signature.dart';
import 'package:path_provider/path_provider.dart';
import 'package:geolocator/geolocator.dart';
import 'package:intl/intl.dart';

import '../../core/theme/colors.dart';
import '../../models/delivery_order_model.dart';
import '../../providers/manifest_provider.dart';
import '../../providers/sync_provider.dart';

class VerificationScreen extends StatefulWidget {
  final DeliveryOrderModel order;
  final String manifestId;
  final List<String> scannedSerialNumbers;

  const VerificationScreen({
    super.key,
    required this.order,
    required this.manifestId,
    this.scannedSerialNumbers = const [],
  });

  @override
  State<VerificationScreen> createState() => _VerificationScreenState();
}

class _VerificationScreenState extends State<VerificationScreen> {
  final _formKey = GlobalKey<FormState>();
  final _receiverNameController = TextEditingController();
  final _notesController = TextEditingController();
  final _barcodeController = TextEditingController();

  File? _imageFile;
  bool _isSaving = false;
  bool _isBarcodeVerified = false;

  // Signature controller for receiver
  final SignatureController _sigController = SignatureController(
    penStrokeWidth: 4,
    penColor: StitchColors.primary,
    exportBackgroundColor: Colors.white,
  );

  // Signature controller for driver
  final SignatureController _driverSigController = SignatureController(
    penStrokeWidth: 4,
    penColor: StitchColors.primary,
    exportBackgroundColor: Colors.white,
  );

  @override
  void dispose() {
    _receiverNameController.dispose();
    _notesController.dispose();
    _barcodeController.dispose();
    _sigController.dispose();
    _driverSigController.dispose();
    super.dispose();
  }

  Future<File> _addWatermark(File imageFile) async {
    try {
      // 1. Get GPS Location
      String locationText = 'GPS: Belum diizinkan / tidak aktif';
      try {
        Position position = await Geolocator.getCurrentPosition(
          desiredAccuracy: LocationAccuracy.high,
          timeLimit: const Duration(seconds: 3),
        );
        locationText = 'GPS: ${position.latitude.toStringAsFixed(6)}, ${position.longitude.toStringAsFixed(6)}';
      } catch (e) {
        debugPrint("Failed to get location for watermark: $e");
      }

      // 2. Get Formatted Timestamp
      final now = DateTime.now();
      final timeStr = DateFormat('HH:mm').format(now);
      final dateStr = DateFormat('EEEE, MMMM d, yyyy').format(now);

      // 3. Load image bytes
      final bytes = await imageFile.readAsBytes();
      final codec = await ui.instantiateImageCodec(bytes);
      final frameInfo = await codec.getNextFrame();
      final ui.Image image = frameInfo.image;

      // 4. Create recorder and canvas
      final recorder = ui.PictureRecorder();
      final canvas = Canvas(recorder, Rect.fromLTWH(0, 0, image.width.toDouble(), image.height.toDouble()));

      // 5. Draw original image
      canvas.drawImage(image, Offset.zero, Paint());

      // 6. Draw semi-transparent dark overlay at the bottom
      final overlayHeight = image.height * 0.16;
      final paint = Paint()
        ..color = Colors.black.withOpacity(0.55)
        ..style = PaintingStyle.fill;
      canvas.drawRect(
        Rect.fromLTWH(0, image.height - overlayHeight, image.width.toDouble(), overlayHeight),
        paint,
      );

      // 7. Paint text
      final textPainter = TextPainter(
        textDirection: ui.TextDirection.ltr,
      );

      // Destination Site/Address text
      String siteText = widget.order.btsSite != null 
          ? "Site: ${widget.order.btsSite!.siteId} - ${widget.order.btsSite!.siteName}"
          : "Tujuan: ${widget.order.destinationAddress}";

      final timeTextStyle = TextStyle(
        color: Colors.white,
        fontSize: (image.height * 0.035).clamp(16.0, 48.0),
        fontWeight: FontWeight.w600,
      );
      
      textPainter.text = TextSpan(
        text: "$timeStr | $dateStr\n$locationText\n$siteText",
        style: timeTextStyle,
      );
      
      textPainter.layout(maxWidth: image.width.toDouble() - 40);
      
      textPainter.paint(
        canvas,
        Offset(20, image.height - overlayHeight + (overlayHeight - textPainter.height) / 2),
      );

      // 8. End recording and convert back to image
      final picture = recorder.endRecording();
      final img = await picture.toImage(image.width, image.height);
      final pngByteData = await img.toByteData(format: ui.ImageByteFormat.png);
      final pngBytes = pngByteData!.buffer.asUint8List();

      // 9. Write bytes back to file
      final tempDir = await getTemporaryDirectory();
      final watermarkedFile = File('${tempDir.path}/wm_${DateTime.now().millisecondsSinceEpoch}.png');
      await watermarkedFile.writeAsBytes(pngBytes);
      return watermarkedFile;
    } catch (e) {
      debugPrint("Failed to add watermark: $e");
      return imageFile; // fallback to original
    }
  }

  Future<void> _takePhoto() async {
    final picker = ImagePicker();
    try {
      final pickedFile = await picker.pickImage(
        source: ImageSource.camera,
        imageQuality: 70,
        maxWidth: 1024,
      );

      if (pickedFile != null) {
        setState(() {
          _isSaving = true;
        });

        final originalFile = File(pickedFile.path);
        final watermarkedFile = await _addWatermark(originalFile);

        setState(() {
          _imageFile = watermarkedFile;
          _isSaving = false;
        });
      }
    } catch (e) {
      setState(() {
        _isSaving = false;
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text("Error launching camera: $e")),
        );
      }
    }
  }

  void _simulateBarcodeScan() {
    // Generate valid looking QR scan code for DO
    final mockScanCode = "INB-${widget.order.doNumber}-ASSET-${DateTime.now().millisecondsSinceEpoch}";
    setState(() {
      _barcodeController.text = mockScanCode;
      _isBarcodeVerified = true;
    });
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text("MOCK QR Scan Success: Code Verified!")),
    );
  }

  Future<void> _submitVerification() async {
    if (!_formKey.currentState!.validate()) return;

    if (!_isBarcodeVerified) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text("Please scan or enter barcode/QR code first to verify delivery"),
          backgroundColor: StitchColors.error,
        ),
      );
      return;
    }

    if (_sigController.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text("Receiver signature is required"),
          backgroundColor: StitchColors.error,
        ),
      );
      return;
    }

    if (_driverSigController.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text("Driver signature is required"),
          backgroundColor: StitchColors.error,
        ),
      );
      return;
    }

    setState(() {
      _isSaving = true;
    });

    final syncProv = Provider.of<SyncProvider>(context, listen: false);
    final manifestProv = Provider.of<ManifestProvider>(context, listen: false);

    // Save signatures locally to files
    String? cameraPath = _imageFile?.path;
    String? recSigPath;
    String? drvSigPath;

    try {
      final tempDir = await getTemporaryDirectory();
      
      final recBytes = await _sigController.toPngBytes();
      if (recBytes != null) {
        final recFile = File('${tempDir.path}/sig_rec_${widget.order.id}.png');
        await recFile.writeAsBytes(recBytes);
        recSigPath = recFile.path;
      }

      final drvBytes = await _driverSigController.toPngBytes();
      if (drvBytes != null) {
        final drvFile = File('${tempDir.path}/sig_drv_${widget.order.id}.png');
        await drvFile.writeAsBytes(drvBytes);
        drvSigPath = drvFile.path;
      }
    } catch (e) {
      debugPrint("Failed to export signature bytes: $e");
    }

    final notesWithDetails = "Received by: ${_receiverNameController.text}. notes: ${_notesController.text}. Barcode: ${_barcodeController.text}";
    final String targetStatus = widget.scannedSerialNumbers.isNotEmpty ? 'returned' : 'delivered';

    final success = await manifestProv.updateDOStatus(
      doId: widget.order.id,
      status: targetStatus,
      notes: notesWithDetails,
      localImagePath: cameraPath,
      receiverSignaturePath: recSigPath,
      driverSignaturePath: drvSigPath,
      scannedSerialNumbers: widget.scannedSerialNumbers,
      isOnline: syncProv.isOnline,
    );

    // If all DOs are delivered/returned/completed, check if we should auto-complete manifest
    if (success && manifestProv.activeManifest != null) {
      bool allCompleted = true;
      for (final doc in manifestProv.activeManifest!.deliveryOrders) {
        if (doc.id != widget.order.id && 
            doc.status != 'delivered' && 
            doc.status != 'completed' && 
            doc.status != 'returned') {
          allCompleted = false;
          break;
        }
      }
      if (allCompleted) {
        await manifestProv.updateManifestStatus(
          manifestId: widget.manifestId,
          status: 'completed',
          isOnline: syncProv.isOnline,
        );
      }
    }

    setState(() {
      _isSaving = false;
    });

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(syncProv.isOnline ? "Delivery submitted successfully!" : "Offline. Task queued locally."),
        ),
      );
      Navigator.pop(context);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: StitchColors.background,
      appBar: AppBar(
        backgroundColor: StitchColors.surface,
        elevation: 0,
        iconTheme: const IconThemeData(color: StitchColors.primary),
        title: const Text(
          "Complete Verification",
          style: TextStyle(color: StitchColors.primary, fontWeight: FontWeight.bold),
        ),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(1.0),
          child: Container(
            color: StitchColors.outlineVariant,
            height: 1.0,
          ),
        ),
      ),
      body: Stack(
        children: [
          SingleChildScrollView(
            padding: const EdgeInsets.all(16.0),
            child: Form(
              key: _formKey,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // 0. Scanned Dismantle Serial Numbers (If reverse logistics / Progress 2)
                  if (widget.scannedSerialNumbers.isNotEmpty) ...[
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: StitchColors.secondaryContainer.withOpacity(0.3),
                        border: Border.all(color: StitchColors.primary.withOpacity(0.2)),
                        borderRadius: BorderRadius.circular(8.0),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              const Icon(Icons.inventory_2, color: StitchColors.primary, size: 18),
                              const SizedBox(width: 8),
                              Text(
                                "DISMANTLED ASSETS (${widget.scannedSerialNumbers.length})",
                                style: const TextStyle(fontWeight: FontWeight.bold, color: StitchColors.primary, fontSize: 13),
                              ),
                            ],
                          ),
                          const SizedBox(height: 8),
                          ...widget.scannedSerialNumbers.map((sn) => Padding(
                            padding: const EdgeInsets.only(bottom: 4.0),
                            child: Row(
                              children: [
                                const Icon(Icons.check, color: StitchColors.slaGreen, size: 14),
                                const SizedBox(width: 6),
                                Text(
                                  "SN: $sn",
                                  style: const TextStyle(fontFamily: 'JetBrains Mono', fontSize: 12, fontWeight: FontWeight.w500),
                                ),
                              ],
                            ),
                          )),
                        ],
                      ),
                    ),
                    const SizedBox(height: 20),
                  ],

                  // 1. QR Code Scan
                  const Text(
                    "SCAN BARCODE / QR CODE",
                    style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: StitchColors.onSurfaceVariant),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Expanded(
                        child: TextFormField(
                          controller: _barcodeController,
                          readOnly: true,
                          validator: (value) => value == null || value.isEmpty ? "Barcode verification required" : null,
                          decoration: InputDecoration(
                            hintText: "Scan barcode stickers...",
                            prefixIcon: const Icon(Icons.qr_code_2),
                            filled: true,
                            fillColor: StitchColors.surfaceContainerLowest,
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(8.0)),
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: StitchColors.primary,
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.all(16),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8.0)),
                        ),
                        onPressed: _isSaving ? null : _simulateBarcodeScan,
                        child: const Icon(Icons.photo_camera),
                      ),
                    ],
                  ),
                  const SizedBox(height: 20),

                  // 2. Photo Proof
                  const Text(
                    "CAMERA PROOF (PHOTO OF DELIVERED UNIT)",
                    style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: StitchColors.onSurfaceVariant),
                  ),
                  const SizedBox(height: 8),
                  GestureDetector(
                    onTap: _isSaving ? null : _takePhoto,
                    child: Container(
                      height: 150,
                      width: double.infinity,
                      decoration: BoxDecoration(
                        color: StitchColors.surfaceContainerLowest,
                        border: Border.all(color: StitchColors.outlineVariant),
                        borderRadius: BorderRadius.circular(8.0),
                      ),
                      child: _imageFile != null
                          ? Stack(
                              fit: StackFit.expand,
                              children: [
                                Image.file(_imageFile!, fit: BoxFit.cover),
                                Positioned(
                                  right: 8,
                                  top: 8,
                                  child: CircleAvatar(
                                    backgroundColor: Colors.black54,
                                    child: IconButton(
                                      icon: const Icon(Icons.edit, color: Colors.white),
                                      onPressed: _takePhoto,
                                    ),
                                  ),
                                )
                              ],
                            )
                          : const Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(Icons.add_a_photo_outlined, size: 40, color: StitchColors.outline),
                                SizedBox(height: 8),
                                Text("TAP TO TAKE PHOTO", style: TextStyle(color: StitchColors.secondary, fontWeight: FontWeight.bold)),
                              ],
                            ),
                    ),
                  ),
                  const SizedBox(height: 20),

                  // 3. Signature
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        "RECEIVER SIGNATURE",
                        style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: StitchColors.onSurfaceVariant),
                      ),
                      TextButton(
                        onPressed: _isSaving ? null : () => _sigController.clear(),
                        child: const Text("CLEAR", style: TextStyle(color: StitchColors.error, fontWeight: FontWeight.bold)),
                      ),
                    ],
                  ),
                  Container(
                    decoration: BoxDecoration(
                      border: Border.all(color: StitchColors.outlineVariant),
                      borderRadius: BorderRadius.circular(8.0),
                    ),
                    child: Signature(
                      controller: _sigController,
                      height: 150,
                      backgroundColor: Colors.white,
                    ),
                  ),
                  const SizedBox(height: 20),

                  // 4. Receiver Name
                  const Text(
                    "RECEIVER NAME",
                    style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: StitchColors.onSurfaceVariant),
                  ),
                  const SizedBox(height: 8),
                  TextFormField(
                    controller: _receiverNameController,
                    enabled: !_isSaving,
                    validator: (value) => value == null || value.isEmpty ? "Receiver name is required" : null,
                    decoration: InputDecoration(
                      hintText: "Enter name of recipient",
                      filled: true,
                      fillColor: StitchColors.surfaceContainerLowest,
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(8.0)),
                    ),
                  ),
                  const SizedBox(height: 20),

                  // 4b. Driver Signature
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        "DRIVER SIGNATURE",
                        style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: StitchColors.onSurfaceVariant),
                      ),
                      TextButton(
                        onPressed: _isSaving ? null : () => _driverSigController.clear(),
                        child: const Text("CLEAR", style: TextStyle(color: StitchColors.error, fontWeight: FontWeight.bold)),
                      ),
                    ],
                  ),
                  Container(
                    decoration: BoxDecoration(
                      border: Border.all(color: StitchColors.outlineVariant),
                      borderRadius: BorderRadius.circular(8.0),
                    ),
                    child: Signature(
                      controller: _driverSigController,
                      height: 150,
                      backgroundColor: Colors.white,
                    ),
                  ),
                  const SizedBox(height: 20),

                  // 5. Notes
                  const Text(
                    "NOTES / REMARKS",
                    style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: StitchColors.onSurfaceVariant),
                  ),
                  const SizedBox(height: 8),
                  TextFormField(
                    controller: _notesController,
                    enabled: !_isSaving,
                    maxLines: 2,
                    decoration: InputDecoration(
                      hintText: "Optional notes...",
                      filled: true,
                      fillColor: StitchColors.surfaceContainerLowest,
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(8.0)),
                    ),
                  ),
                  const SizedBox(height: 32),

                  // Submit Button
                  SizedBox(
                    width: double.infinity,
                    height: 56,
                    child: ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.green[700],
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8.0)),
                      ),
                      onPressed: _isSaving ? null : _submitVerification,
                      child: _isSaving
                          ? const Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                SizedBox(
                                  width: 20,
                                  height: 20,
                                  child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                                ),
                                SizedBox(width: 12),
                                Text("SUBMITTING PROOF...", style: TextStyle(fontWeight: FontWeight.bold)),
                              ],
                            )
                          : const Text("SUBMIT PROOF OF DELIVERY", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                    ),
                  ),
                ],
              ),
            ),
          ),

          // Loading Backdrop Overlay
          if (_isSaving)
            Container(
              color: Colors.black.withValues(alpha: 0.45),
              child: Center(
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 28),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    boxShadow: const [
                      BoxShadow(color: Colors.black26, blurRadius: 16, offset: Offset(0, 4)),
                    ],
                  ),
                  child: const Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      SizedBox(
                        width: 48,
                        height: 48,
                        child: CircularProgressIndicator(
                          color: Color(0xFF2E7D32),
                          strokeWidth: 4,
                        ),
                      ),
                      SizedBox(height: 20),
                      Text(
                        "Submitting Proof of Delivery...",
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF2E7D32),
                        ),
                        textAlign: TextAlign.center,
                      ),
                      SizedBox(height: 6),
                      Text(
                        "Uploading signature & photo proof...",
                        style: TextStyle(fontSize: 12, color: StitchColors.secondary),
                      ),
                    ],
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}
