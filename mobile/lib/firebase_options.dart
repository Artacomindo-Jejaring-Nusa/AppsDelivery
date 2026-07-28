import 'package:firebase_core/firebase_core.dart' show FirebaseOptions;

class DefaultFirebaseOptions {
  static FirebaseOptions get currentPlatform {
    return android;
  }

  static const FirebaseOptions android = FirebaseOptions(
    apiKey: 'AIzaSyC4dhdCOI6LfxPFyIAAzckgjsVgABEDiKs',
    appId: '1:175314673581:android:5b288c18413801b5d50b24',
    messagingSenderId: '175314673581',
    projectId: 'appsdelivery-logistics',
    storageBucket: 'appsdelivery-logistics.firebasestorage.app',
  );
}
