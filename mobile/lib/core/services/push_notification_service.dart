import 'dart:async';
import 'dart:math';
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

  // Notification group key for Android grouped notifications
  static const String _groupKey = 'com.artacomindo.delivery.manifest';
  static const String _channelId = 'high_importance_channel';
  static const String _channelName = 'High Importance Notifications';

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
        _channelId,
        _channelName,
        description: 'Used for important logistics delivery notifications.',
        importance: Importance.max,
      );

      await _localNotifications
          .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()
          ?.createNotificationChannel(channel);

      // 5. Handling Foreground Notification with Grouped Support
      FirebaseMessaging.onMessage.listen((RemoteMessage message) {
        RemoteNotification? notification = message.notification;
        AndroidNotification? android = message.notification?.android;

        if (notification != null && android != null) {
          // Generate unique ID for each notification so they don't replace each other
          final int notifId = Random().nextInt(100000);

          // Show the individual notification
          _localNotifications.show(
            notifId,
            notification.title,
            notification.body,
            NotificationDetails(
              android: AndroidNotificationDetails(
                _channelId,
                _channelName,
                channelDescription: 'Used for important logistics delivery notifications.',
                icon: '@mipmap/ic_launcher',
                importance: Importance.max,
                priority: Priority.high,
                groupKey: _groupKey,
              ),
            ),
          );

          // Show a summary notification (Android InboxStyle grouping)
          _localNotifications.show(
            0, // Summary notification always has ID 0
            'Merkurius Delivery',
            'Anda memiliki penugasan baru',
            NotificationDetails(
              android: AndroidNotificationDetails(
                _channelId,
                _channelName,
                channelDescription: 'Used for important logistics delivery notifications.',
                icon: '@mipmap/ic_launcher',
                importance: Importance.max,
                priority: Priority.high,
                groupKey: _groupKey,
                setAsGroupSummary: true,
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
