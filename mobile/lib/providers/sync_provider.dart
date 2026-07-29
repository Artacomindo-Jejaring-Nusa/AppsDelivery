import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:dio/dio.dart';

import '../core/api/api_client.dart';
import '../core/database/database_helper.dart';

class SyncProvider extends ChangeNotifier {
  final ApiClient apiClient;
  final DatabaseHelper dbHelper;

  bool _isOnline = true;
  bool _isSyncing = false;
  int _pendingCount = 0;

  bool get isOnline => _isOnline;
  bool get isSyncing => _isSyncing;
  int get pendingCount => _pendingCount;

  SyncProvider({required this.apiClient, required this.dbHelper}) {
    updatePendingCount();
    // Periodically run check & sync trigger
    _startSyncCheckTimer();
  }

  void setOnlineStatus(bool online) {
    if (_isOnline != online) {
      _isOnline = online;
      notifyListeners();
      if (online) {
        syncNow();
      }
    }
  }

  Future<void> updatePendingCount() async {
    final list = await dbHelper.getQueue();
    _pendingCount = list.length;
    notifyListeners();
  }

  Future<void> _startSyncCheckTimer() async {
    while (true) {
      await Future.delayed(const Duration(seconds: 15));
      if (_isOnline && _pendingCount > 0 && !_isSyncing) {
        await syncNow();
      }
    }
  }

  Future<void> syncNow() async {
    if (_isSyncing) return;
    _isSyncing = true;
    notifyListeners();

    try {
      final queue = await dbHelper.getQueue();
      for (final task in queue) {
        final int id = task['id'];
        final String endpoint = task['endpoint'];
        final String method = task['method'];
        final Map<String, dynamic> payload = jsonDecode(task['payload']);
        final String? imagePath = task['image_path'];

        try {
          String? cameraUrl;
          String? recSigUrl;
          String? drvSigUrl;

          // 1. Upload photo and signatures if exist locally
          if (imagePath != null && imagePath.isNotEmpty) {
            final pathsList = imagePath.split(',');
            for (final p in pathsList) {
              if (p.isEmpty) continue;
              try {
                final formData = FormData.fromMap({
                  'file': await MultipartFile.fromFile(p),
                });
                final uploadRes = await apiClient.dio.post('/api/v1/uploads', data: formData);
                if (uploadRes.statusCode == 201) {
                  final url = uploadRes.data['data']['url'];
                  if (p.contains('sig_rec_') || (p.contains('sig_') && !p.contains('drv_'))) {
                    recSigUrl = url;
                  } else if (p.contains('sig_drv_') || p.contains('drv_')) {
                    drvSigUrl = url;
                  } else {
                    cameraUrl = url;
                  }
                }
              } catch (err) {
                debugPrint("Failed to upload file $p in sync queue: $err");
              }
            }
          }

          // 1b. Upload dismantle assets if present in offline task payload
          final scannedSns = payload['scanned_serial_numbers'];
          if (scannedSns != null && scannedSns is List && scannedSns.isNotEmpty) {
            final uriParts = endpoint.split('/');
            String? doId;
            if (uriParts.length >= 4) {
              doId = uriParts[uriParts.length - 2];
            }
            if (doId != null) {
              try {
                final assets = scannedSns.map((sn) => {
                  'category': 'Network Equipment',
                  'item_name': 'ZTE BBU/RRU unit',
                  'serial_number': sn,
                  'quantity': 1,
                  'unit': 'pcs',
                  'condition': 'good',
                  'notes': 'Dismantled from site via driver scan'
                }).toList();

                await apiClient.dio.post(
                  '/api/v1/delivery-orders/$doId/assets/batch',
                  data: {'assets': assets},
                );
              } catch (e) {
                debugPrint("Failed to upload dismantle assets in sync: $e");
              }
            }
          }
          payload.remove('scanned_serial_numbers');

          // 2. Adjust payload if we got uploaded URLs
          String finalNotes = payload['notes'] ?? '';
          if (cameraUrl != null) {
            finalNotes = "$finalNotes [Proof of Delivery Photo: $cameraUrl]";
          }
          if (recSigUrl != null) {
            finalNotes = "$finalNotes [Receiver Signature: $recSigUrl]";
          }
          if (drvSigUrl != null) {
            finalNotes = "$finalNotes [Driver Signature: $drvSigUrl]";
          }
          payload['notes'] = finalNotes.trim();

          // 3. Send final status update request
          Response response;
          if (method == 'POST') {
            response = await apiClient.dio.post(endpoint, data: payload);
          } else {
            response = await apiClient.dio.put(endpoint, data: payload);
          }

          if (response.statusCode == 200 || response.statusCode == 201) {
            await dbHelper.deleteFromQueue(id);
          }
        } catch (e) {
          // If a specific task fails, log and continue, sync next time
          debugPrint("Failed to sync offline task $id: $e");
        }
      }
    } catch (e) {
      debugPrint("Error during sync: $e");
    } finally {
      _isSyncing = false;
      await updatePendingCount();
    }
  }
}
