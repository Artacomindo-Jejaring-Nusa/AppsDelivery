import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../core/i18n/app_translations.dart';

class LanguageProvider extends ChangeNotifier {
  static const String _keyLang = 'app_language';
  String _currentLanguage = AppTranslations.defaultLanguage;

  String get currentLanguage => _currentLanguage;

  LanguageProvider() {
    _loadLanguagePreference();
  }

  Future<void> _loadLanguagePreference() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      _currentLanguage = prefs.getString(_keyLang) ?? AppTranslations.defaultLanguage;
      notifyListeners();
    } catch (e) {
      debugPrint("Error loading language preference: $e");
    }
  }

  Future<void> setLanguage(String code) async {
    if (_currentLanguage == code) return;
    _currentLanguage = code;
    notifyListeners();
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_keyLang, code);
    } catch (e) {
      debugPrint("Error saving language preference: $e");
    }
  }

  String tr(String key) {
    return AppTranslations.getText(_currentLanguage, key);
  }
}
