import 'dart:async';
import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../core/api/api_client.dart';

class LocationProvider extends ChangeNotifier {
  final ApiClient apiClient;

  bool _isTracking = false;
  Position? _currentPosition;
  String? _driverId;
  Timer? _timer;

  bool get isTracking => _isTracking;
  Position? get currentPosition => _currentPosition;
  String? get driverId => _driverId;

  LocationProvider({required this.apiClient}) {
    _loadDriverId();
  }

  Future<void> _loadDriverId() async {
    final prefs = await SharedPreferences.getInstance();
    _driverId = prefs.getString('driver_id') ?? 'd1eebc99-9c0b-4ef8-bb6d-6bb9bd380b11';
    notifyListeners();
  }

  Future<void> setDriverId(String id) async {
    _driverId = id;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('driver_id', id);
    notifyListeners();
  }

  // Submit coordinate and automatically retrieve driver_id (resolving user_id internally)
  Future<String?> pingLocation() async {
    try {
      double lat = -3.31940000;  // Default seed (Banjarmasin)
      double lng = 114.59070000;

      // Try fetching device coordinates
      try {
        final hasPermission = await _handlePermission();
        if (hasPermission) {
          final position = await Geolocator.getCurrentPosition(
            locationSettings: const LocationSettings(
              accuracy: LocationAccuracy.high,
              timeLimit: Duration(seconds: 5),
            ),
          );
          _currentPosition = position;
          lat = position.latitude;
          lng = position.longitude;
        }
      } catch (e) {
        debugPrint("Could not fetch real device location, using fallback coordinate: $e");
      }

      final response = await apiClient.dio.post('/api/v1/drivers/location', data: {
        'latitude': lat,
        'longitude': lng,
      });

      if (response.statusCode == 201) {
        final id = response.data['data']['driver_id'] as String;
        await setDriverId(id);
        return id;
      }
    } catch (e) {
      debugPrint("Failed to ping driver location: $e");
    }
    return _driverId ?? 'd1eebc99-9c0b-4ef8-bb6d-6bb9bd380b11';
  }

  Future<bool> _handlePermission() async {
    bool serviceEnabled;
    LocationPermission permission;

    serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      return false;
    }

    permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) {
        return false;
      }
    }

    if (permission == LocationPermission.deniedForever) {
      return false;
    }

    return true;
  }

  void startTracking() {
    if (_isTracking) return;
    _isTracking = true;
    notifyListeners();

    // Start timer for posting coordinates every 15 seconds
    _timer = Timer.periodic(const Duration(seconds: 15), (timer) async {
      await pingLocation();
    });
  }

  void stopTracking() {
    _timer?.cancel();
    _timer = null;
    _isTracking = false;
    notifyListeners();
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }
}
