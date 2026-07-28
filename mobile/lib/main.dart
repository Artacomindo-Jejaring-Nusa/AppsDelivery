import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'core/api/api_client.dart';
import 'core/database/database_helper.dart';
import 'core/services/push_notification_service.dart';
import 'core/theme/colors.dart';
import 'providers/auth_provider.dart';
import 'providers/location_provider.dart';
import 'providers/manifest_provider.dart';
import 'providers/sync_provider.dart';
import 'screens/auth/login_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Initialize Firebase Push Notifications & Core Services
  final apiClient = ApiClient();
  final dbHelper = DatabaseHelper();
  
  try {
    await PushNotificationService().initialize();
  } catch (e) {
    debugPrint("Firebase init error: $e");
  }

  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(
          create: (_) => AuthProvider(apiClient: apiClient),
        ),
        ChangeNotifierProvider(
          create: (_) => LocationProvider(apiClient: apiClient),
        ),
        ChangeNotifierProvider(
          create: (_) => SyncProvider(apiClient: apiClient, dbHelper: dbHelper),
        ),
        ChangeNotifierProvider(
          create: (_) => ManifestProvider(apiClient: apiClient, dbHelper: dbHelper),
        ),
      ],
      child: const MyApp(),
    ),
  );
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Driver Portal',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        primaryColor: StitchColors.primary,
        colorScheme: ColorScheme.fromSeed(
          seedColor: StitchColors.primary,
          surface: StitchColors.background,
          primaryContainer: StitchColors.primaryContainer,
          error: StitchColors.error,
        ),
        fontFamily: 'Inter',
        appBarTheme: const AppBarTheme(
          iconTheme: IconThemeData(color: StitchColors.primary),
          titleTextStyle: TextStyle(
            fontFamily: 'Inter',
            color: StitchColors.primary,
            fontSize: 20,
            fontWeight: FontWeight.bold,
          ),
        ),
      ),
      home: const LoginScreen(),
    );
  }
}
