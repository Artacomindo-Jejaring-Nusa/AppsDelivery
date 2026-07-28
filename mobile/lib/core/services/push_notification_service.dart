import 'dart:async';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import '../api/api_client.dart';

import '../../firebase_options.dart';

// Background message handler callback
@pragma('vm:entry-point')
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);
  debugPrint("Handling background message: ${message.messageId}");
}

class PushNotificationService {
  static final PushNotificationService _instance = PushNotificationService._internal();
  factory PushNotificationService() => _instance;
  PushNotificationService._internal();

  final ApiClient _apiClient = ApiClient();
  FirebaseMessaging get _fcm => FirebaseMessaging.instance;
  final FlutterLocalNotificationsPlugin _localNotifications = FlutterLocalNotificationsPlugin();

  String? _fcmToken;
  String? get fcmToken => _fcmToken;

  Future<void> initialize() async {
    try {
      // 1. Inisialisasi Firebase Core dengan Options
      await Firebase.initializeApp(
        options: DefaultFirebaseOptions.currentPlatform,
      );

      // 2. Set Background Handler
      FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);

      // 3. Minta Izin Notification (Android 13+ / iOS)
      NotificationSettings settings = await _fcm.requestPermission(
        alert: true,
        badge: true,
        sound: true,
      );

      debugPrint('User notification permission status: ${settings.authorizationStatus}');

      // 4. Inisialisasi Local Notification untuk Foreground Status
      const AndroidInitializationSettings androidInitSettings = AndroidInitializationSettings('@mipmap/ic_launcher');
      const InitializationSettings initSettings = InitializationSettings(android: androidInitSettings);

      await _localNotifications.initialize(initSettings);

      // Channel Android High Importance
      const AndroidNotificationChannel channel = AndroidNotificationChannel(
        'high_importance_channel',
        'High Importance Notifications',
        description: 'Used for important logistics delivery notifications.',
        importance: Importance.max,
      );

      await _localNotifications
          .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()
          ?.createNotificationChannel(channel);

      // 5. Handling Foreground Notification
      FirebaseMessaging.onMessage.listen((RemoteMessage message) {
        RemoteNotification? notification = message.notification;
        AndroidNotification? android = message.notification?.android;

        if (notification != null && android != null) {
          _localNotifications.show(
            notification.hashCode,
            notification.title,
            notification.body,
            NotificationDetails(
              android: AndroidNotificationDetails(
                channel.id,
                channel.name,
                channelDescription: channel.description,
                icon: '@mipmap/ic_launcher',
                importance: Importance.max,
                priority: Priority.high,
              ),
            ),
          );
        }
      });

      // 6. Ambil Token FCM & Kirim ke Backend
      try {
        _fcmToken = await _fcm.getToken();
        debugPrint('====================================================');
        debugPrint('🔥 FIREBASE FCM TOKEN: $_fcmToken');
        debugPrint('====================================================');

        if (_fcmToken != null) {
          await syncTokenToBackend(_fcmToken!);
        }
      } catch (tokenErr) {
        debugPrint('❌ Error fetching FCM Token: $tokenErr');
      }

      // Token Refresh Listener
      _fcm.onTokenRefresh.listen((newToken) async {
        _fcmToken = newToken;
        await syncTokenToBackend(newToken);
      });

    } catch (e) {
      debugPrint('Error initializing PushNotificationService: $e');
    }
  }

  Future<void> syncTokenToBackend(String token) async {
    try {
      await _apiClient.dio.post('/api/v1/users/fcm-token', data: {
        'fcm_token': token,
      });
      debugPrint('FCM token synced to backend successfully');
    } catch (e) {
      debugPrint('Failed to sync FCM token to backend: $e');
    }
  }
}
