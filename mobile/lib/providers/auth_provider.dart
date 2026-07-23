import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:dio/dio.dart';

import '../core/api/api_client.dart';
import '../models/user_model.dart';

class AuthProvider extends ChangeNotifier {
  final ApiClient apiClient;

  UserModel? _user;
  bool _isAuthenticated = false;
  bool _isLoading = false;
  String? _errorMessage;

  UserModel? get user => _user;
  bool get isAuthenticated => _isAuthenticated;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;

  AuthProvider({required this.apiClient}) {
    _checkExistingToken();
  }

  Future<void> _checkExistingToken() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('auth_token');
    if (token != null && token.isNotEmpty) {
      _isAuthenticated = true;
      await fetchProfile();
    }
  }

  Future<bool> login(String username, String password) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final response = await apiClient.dio.post('/api/v1/auth/login', data: {
        'username': username,
        'password': password,
      });

      if (response.statusCode == 200) {
        final data = response.data['data'];
        final token = data['token'];
        _user = UserModel.fromJson(data['user']);

        // Check if role is driver, only drivers are allowed in Driver Portal
        if (_user!.role != 'driver' && _user!.role != 'admin') {
          _errorMessage = "Access denied. Only drivers can sign in.";
          _isLoading = false;
          notifyListeners();
          return false;
        }

        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('auth_token', token);
        await prefs.setString('user_username', _user!.username);
        await prefs.setString('user_name', _user!.fullName);

        _isAuthenticated = true;
        _isLoading = false;
        notifyListeners();
        return true;
      }
    } on DioException catch (e) {
      _errorMessage = e.response?.data['message'] ?? 'Login failed. Please check your credentials.';
    } catch (e) {
      _errorMessage = 'An unexpected error occurred: $e';
    }

    _isLoading = false;
    notifyListeners();
    return false;
  }

  Future<void> fetchProfile() async {
    try {
      final response = await apiClient.dio.get('/api/v1/users/me');
      if (response.statusCode == 200) {
        _user = UserModel.fromJson(response.data['data']);
        notifyListeners();
      }
    } catch (e) {
      // If token expired/invalid, clear auth state
      if (e is DioException && e.response?.statusCode == 401) {
        logout();
      }
    }
  }

  Future<void> logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('auth_token');
    await prefs.remove('user_username');
    await prefs.remove('user_name');
    _user = null;
    _isAuthenticated = false;
    notifyListeners();
  }
}
