import 'dart:io';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:image_picker/image_picker.dart';
import 'package:signature/signature.dart';
import 'package:path_provider/path_provider.dart';

import '../../core/theme/colors.dart';
import '../../models/delivery_order_model.dart';
import '../../providers/manifest_provider.dart';
import '../../providers/sync_provider.dart';

class VerificationScreen extends StatefulWidget {
  final DeliveryOrderModel order;
  final String manifestId;

  const VerificationScreen({super.key, required this.order, required this.manifestId});

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

  // Signature controller
  final SignatureController _sigController = SignatureController(
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
    super.dispose();
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
          _imageFile = File(pickedFile.path);
        });
      }
    } catch (e) {
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

    setState(() {
      _isSaving = true;
    });

    final syncProv = Provider.of<SyncProvider>(context, listen: false);
    final manifestProv = Provider.of<ManifestProvider>(context, listen: false);

    // Save signature locally to file
    String? localImagePath;
    try {
      final sigBytes = await _sigController.toPngBytes();
      if (sigBytes != null) {
        final tempDir = await getTemporaryDirectory();
        final file = File('${tempDir.path}/sig_${widget.order.id}.png');
        await file.writeAsBytes(sigBytes);
        // If we have camera picture, upload camera proof instead, or combine
        localImagePath = _imageFile?.path ?? file.path;
      }
    } catch (e) {
      debugPrint("Failed to export signature bytes: $e");
    }

    final notesWithDetails = "Received by: ${_receiverNameController.text}. notes: ${_notesController.text}. Barcode: ${_barcodeController.text}";

    final success = await manifestProv.updateDOStatus(
      doId: widget.order.id,
      status: 'delivered',
      notes: notesWithDetails,
      localImagePath: localImagePath,
      isOnline: syncProv.isOnline,
    );

    // If all DOs are delivered, check if we should auto-complete manifest
    if (success && manifestProv.activeManifest != null) {
      bool allCompleted = true;
      for (final doc in manifestProv.activeManifest!.deliveryOrders) {
        if (doc.id != widget.order.id && doc.status != 'delivered' && doc.status != 'completed') {
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
