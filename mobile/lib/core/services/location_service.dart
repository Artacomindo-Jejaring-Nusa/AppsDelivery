import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:geolocator/geolocator.dart';
import '../api/api_client.dart';

class LocationService extends ChangeNotifier {
  static final LocationService _instance = LocationService._internal();
  factory LocationService() => _instance;
  LocationService._internal();

  final ApiClient _apiClient = ApiClient();

  Timer? _timer;
  bool _isTracking = false;
  double? _lastLat;
  double? _lastLng;
  DateTime? _lastPingTime;
  String _statusMessage = 'GPS Inactive';

  bool get isTracking => _isTracking;
  double? get lastLat => _lastLat;
  double? get lastLng => _lastLng;
  DateTime? get lastPingTime => _lastPingTime;
  String get statusMessage => _statusMessage;

  // Start periodic GPS tracking (every 15 seconds)
  Future<void> startTracking({int intervalSeconds = 15}) async {
    if (_isTracking) return;

    _statusMessage = 'Initializing GPS...';
    notifyListeners();

    // Check & request location permissions
    bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      _statusMessage = 'GPS Service Disabled on Device';
      notifyListeners();
      return;
    }

    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) {
        _statusMessage = 'GPS Permission Denied';
        notifyListeners();
        return;
      }
    }

    if (permission == LocationPermission.deniedForever) {
      _statusMessage = 'GPS Permission Permanently Denied';
      notifyListeners();
      return;
    }

    _isTracking = true;
    _statusMessage = 'GPS Tracking Active (Live Pinging)';
    notifyListeners();

    // Trigger immediate ping
    await pingCurrentLocation();

    // Start periodic timer
    _timer?.cancel();
    _timer = Timer.periodic(Duration(seconds: intervalSeconds), (timer) async {
      await pingCurrentLocation();
    });
  }

  // Stop tracking
  void stopTracking() {
    _timer?.cancel();
    _timer = null;
    _isTracking = false;
    _statusMessage = 'GPS Tracking Stopped';
    notifyListeners();
  }

  // Fetch current position & post coordinates to backend API
  Future<bool> pingCurrentLocation() async {
    try {
      Position position = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
          distanceFilter: 10,
        ),
      );

      _lastLat = position.latitude;
      _lastLng = position.longitude;
      _lastPingTime = DateTime.now();

      // Send to backend API endpoint POST /api/v1/drivers/location
      final response = await _apiClient.dio.post('/api/v1/drivers/location', data: {
        'latitude': position.latitude,
        'longitude': position.longitude,
      });

      if (response.statusCode == 200 || response.statusCode == 201) {
        _statusMessage = 'Live GPS Synced (${_lastLat?.toStringAsFixed(4)}, ${_lastLng?.toStringAsFixed(4)})';
        debugPrint('Location ping success: $_lastLat, $_lastLng');
        notifyListeners();
        return true;
      }
    } catch (e) {
      debugPrint('Location ping failed: $e');
      _statusMessage = 'GPS Sync Retry Needed';
      notifyListeners();
    }
    return false;
  }

  // Fallback simulation ping (useful for indoor testing)
  Future<bool> sendSimulatedPing(double lat, double lng) async {
    try {
      _lastLat = lat;
      _lastLng = lng;
      _lastPingTime = DateTime.now();

      final response = await _apiClient.dio.post('/api/v1/drivers/location', data: {
        'latitude': lat,
        'longitude': lng,
      });

      if (response.statusCode == 200 || response.statusCode == 201) {
        _statusMessage = 'Simulated GPS Synced ($lat, $lng)';
        notifyListeners();
        return true;
      }
    } catch (e) {
      debugPrint('Simulated location ping failed: $e');
    }
    return false;
  }
}
