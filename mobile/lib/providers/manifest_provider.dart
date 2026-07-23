import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:dio/dio.dart';

import '../core/api/api_client.dart';
import '../core/database/database_helper.dart';
import '../models/manifest_model.dart';
import '../models/delivery_order_model.dart';

class ManifestProvider extends ChangeNotifier {
  final ApiClient apiClient;
  final DatabaseHelper dbHelper;

  ManifestModel? _activeManifest;
  bool _isLoading = false;
  String? _errorMessage;

  ManifestModel? get activeManifest => _activeManifest;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;

  ManifestProvider({required this.apiClient, required this.dbHelper});

  Future<void> fetchActiveManifest(String? driverId, bool isOnline) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    if (!isOnline) {
      // Load from offline SQFlite cache
      final cached = await dbHelper.getCachedManifest();
      if (cached != null) {
        final decodedJson = jsonDecode(cached['json_data']);
        _activeManifest = ManifestModel.fromJson(decodedJson);
      } else {
        _activeManifest = null;
        _errorMessage = "Offline. No cached manifest data found.";
      }
      _isLoading = false;
      notifyListeners();
      return;
    }

    try {
      // 1. Fetch all manifests
      final response = await apiClient.dio.get('/api/v1/manifests?per_page=100');
      if (response.statusCode == 200) {
        final list = response.data['data'] as List;

        // 2. Filter manifests for this driver with status in_transit or dispatched
        String? targetManifestId;
        for (final item in list) {
          final mStatus = item['status'];
          final isStatusActive = mStatus == 'in_transit' || mStatus == 'dispatched';
          if (isStatusActive && (driverId == null || item['driver_id'] == driverId)) {
            targetManifestId = item['id'];
            break;
          }
        }

        // Fallback: If not found with exact driverId, pick first active in_transit manifest
        if (targetManifestId == null) {
          for (final item in list) {
            final mStatus = item['status'];
            if (mStatus == 'in_transit' || mStatus == 'dispatched') {
              targetManifestId = item['id'];
              break;
            }
          }
        }

        if (targetManifestId != null) {
          // 3. Fetch detailed manifest with DO list
          final detailRes = await apiClient.dio.get('/api/v1/manifests/$targetManifestId');
          if (detailRes.statusCode == 200) {
            final manifestData = detailRes.data['data'];
            _activeManifest = ManifestModel.fromJson(manifestData);

            // Cache manifest locally in SQFlite for offline access
            await dbHelper.cacheManifest(
              _activeManifest!.id,
              _activeManifest!.manifestNumber,
              _activeManifest!.status,
              manifestData,
            );
          }
        } else {
          _activeManifest = null;
        }
      }
    } on DioException catch (e) {
      _errorMessage = e.response?.data['message'] ?? 'Failed to load manifest';
      // Load fallback from cache
      final cached = await dbHelper.getCachedManifest();
      if (cached != null) {
        _activeManifest = ManifestModel.fromJson(jsonDecode(cached['json_data']));
      }
    } catch (e) {
      _errorMessage = 'An error occurred: $e';
    }

    _isLoading = false;
    notifyListeners();
  }

  Future<bool> updateDOStatus({
    required String doId,
    required String status,
    required String notes,
    String? localImagePath,
    required bool isOnline,
  }) async {
    final endpoint = '/api/v1/delivery-orders/$doId/status';
    final payload = {
      'status': status,
      'notes': notes,
    };

    if (!isOnline) {
      // Save locally in offline queue
      await dbHelper.queueOfflineTask(
        action: 'UPDATE_DO_STATUS',
        endpoint: endpoint,
        method: 'PUT',
        payload: payload,
        imagePath: localImagePath,
      );

      // Update in-memory active manifest status to reflect locally
      if (_activeManifest != null) {
        final index = _activeManifest!.deliveryOrders.indexWhere((doItem) => doItem.id == doId);
        if (index != -1) {
          final oldDO = _activeManifest!.deliveryOrders[index];
          _activeManifest!.deliveryOrders[index] = DeliveryOrderModel(
            id: oldDO.id,
            doNumber: oldDO.doNumber,
            description: oldDO.description,
            status: status, // Local status change
            slaHours: oldDO.slaHours,
            slaDeadline: oldDO.slaDeadline,
            slaStatus: oldDO.slaStatus,
            originAddress: oldDO.originAddress,
            destinationAddress: oldDO.destinationAddress,
            notes: "$notes (Offline Update)",
            btsSite: oldDO.btsSite,
          );
          notifyListeners();
        }
      }
      return true;
    }

    try {
      String? publicImageUrl;

      // Upload image if online
      if (localImagePath != null && localImagePath.isNotEmpty) {
        final formData = FormData.fromMap({
          'file': await MultipartFile.fromFile(localImagePath),
        });
        final uploadRes = await apiClient.dio.post('/api/v1/uploads', data: formData);
        if (uploadRes.statusCode == 201) {
          publicImageUrl = uploadRes.data['data']['url'];
        }
      }

      if (publicImageUrl != null) {
        payload['notes'] = "$notes [Proof of Delivery Photo: $publicImageUrl]".trim();
      }

      final response = await apiClient.dio.put(endpoint, data: payload);
      if (response.statusCode == 200) {
        // Refresh manifest data
        if (_activeManifest != null && _activeManifest!.driverId.isNotEmpty) {
          fetchActiveManifest(_activeManifest!.driverId, true);
        }
        return true;
      }
    } catch (e) {
      debugPrint("Failed to update status online, queueing offline: $e");
      // Fallback to offline queue
      await dbHelper.queueOfflineTask(
        action: 'UPDATE_DO_STATUS',
        endpoint: endpoint,
        method: 'PUT',
        payload: payload,
        imagePath: localImagePath,
      );
    }
    return false;
  }

  Future<bool> updateManifestStatus({
    required String manifestId,
    required String status,
    required bool isOnline,
  }) async {
    final endpoint = '/api/v1/manifests/$manifestId/status';
    final payload = {'status': status};

    if (!isOnline) {
      await dbHelper.queueOfflineTask(
        action: 'UPDATE_MANIFEST_STATUS',
        endpoint: endpoint,
        method: 'PUT',
        payload: payload,
      );
      return true;
    }

    try {
      final response = await apiClient.dio.put(endpoint, data: payload);
      if (response.statusCode == 200) {
        if (_activeManifest != null && _activeManifest!.driverId.isNotEmpty) {
          fetchActiveManifest(_activeManifest!.driverId, true);
        }
        return true;
      }
    } catch (e) {
      await dbHelper.queueOfflineTask(
        action: 'UPDATE_MANIFEST_STATUS',
        endpoint: endpoint,
        method: 'PUT',
        payload: payload,
      );
    }
    return false;
  }
}
