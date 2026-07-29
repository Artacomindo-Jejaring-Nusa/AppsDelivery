import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';

class ApiClient {
  static const String defaultBaseUrl = 'http://2.2.2.50:8080';
  late Dio dio;

  ApiClient() {
    dio = Dio(
      BaseOptions(
        baseUrl: defaultBaseUrl,
        connectTimeout: const Duration(seconds: 10),
        receiveTimeout: const Duration(seconds: 10),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      ),
    );

    _loadSavedBaseUrl();

    // Auth Token Interceptor
    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final prefs = await SharedPreferences.getInstance();
          final token = prefs.getString('auth_token');
          if (token != null && token.isNotEmpty) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          return handler.next(options);
        },
        onError: (DioException e, handler) {
          return handler.next(e);
        },
      ),
    );
  }

  Future<void> _loadSavedBaseUrl() async {
    final prefs = await SharedPreferences.getInstance();
    final savedUrl = prefs.getString('base_url');
    if (savedUrl != null && savedUrl.isNotEmpty) {
      dio.options.baseUrl = savedUrl;
    }
  }

  Future<void> setBaseUrl(String newUrl) async {
    dio.options.baseUrl = newUrl;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('base_url', newUrl);
  }
}
