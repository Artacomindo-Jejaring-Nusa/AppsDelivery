import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/services/push_notification_service.dart';
import '../../core/theme/colors.dart';
import '../../providers/auth_provider.dart';
import '../../providers/location_provider.dart';
import '../home/home_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _usernameController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _obscurePassword = true;
  int _logoTapCount = 0;
  bool _isLoggingIn = false;
  String _loadingMessage = "Authenticating...";

  @override
  void dispose() {
    _usernameController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  void _showServerSettings() {
    final authProv = Provider.of<AuthProvider>(context, listen: false);
    final urlController = TextEditingController(text: authProv.apiClient.dio.options.baseUrl);

    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text("API Base URL Configuration"),
          content: TextField(
            controller: urlController,
            decoration: const InputDecoration(
              labelText: "Server Address",
              hintText: "http://192.168.1.X:8080",
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text("CANCEL"),
            ),
            ElevatedButton(
              onPressed: () async {
                await authProv.apiClient.setBaseUrl(urlController.text.trim());
                if (context.mounted) {
                  Navigator.pop(context);
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text("Base URL updated to: ${urlController.text.trim()}")),
                  );
                }
              },
              child: const Text("SAVE"),
            ),
          ],
        );
      },
    );
  }

  Future<void> _handleLogin() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _isLoggingIn = true;
      _loadingMessage = "Authenticating driver...";
    });

    final authProv = Provider.of<AuthProvider>(context, listen: false);
    final locProv = Provider.of<LocationProvider>(context, listen: false);

    try {
      final success = await authProv.login(
        _usernameController.text.trim(),
        _passwordController.text,
      );

      if (success && mounted) {
        setState(() {
          _loadingMessage = "Connecting GPS & loading active manifest...";
        });

        // 1. Initial GPS ping to resolve driver_id and start live tracking
        await locProv.pingLocation();
        locProv.startTracking();

        if (mounted) {
          setState(() {
            _loadingMessage = "Welcome! Opening Portal...";
          });
          await Future.delayed(const Duration(milliseconds: 400));
          if (mounted) {
            Navigator.pushReplacement(
              context,
              MaterialPageRoute(builder: (context) => const HomeScreen()),
            );
          }
        }
      } else if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(authProv.errorMessage ?? "Authentication failed"),
            backgroundColor: StitchColors.error,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text("Error during login: $e"),
            backgroundColor: StitchColors.error,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isLoggingIn = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final authProv = Provider.of<AuthProvider>(context);

    final isLoading = _isLoggingIn || authProv.isLoading;

    return Scaffold(
      backgroundColor: StitchColors.background,
      appBar: AppBar(
        backgroundColor: StitchColors.surface,
        elevation: 0,
        title: GestureDetector(
          onDoubleTap: () {
            _logoTapCount++;
            if (_logoTapCount >= 2) {
              _logoTapCount = 0;
              _showServerSettings();
            }
          },
          child: const Text(
            "Driver Portal",
            style: TextStyle(
              color: StitchColors.primary,
              fontWeight: FontWeight.bold,
              fontSize: 22,
            ),
          ),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.help_outline, color: StitchColors.secondary),
            onPressed: () {},
          ),
          IconButton(
            icon: const Icon(Icons.language, color: StitchColors.secondary),
            onPressed: () {},
          ),
        ],
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(1.0),
          child: Container(
            color: StitchColors.outlineVariant,
            height: 1.0,
          ),
        ),
      ),
      body: Stack(
        children: [
          Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 24.0),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Text(
                    "Welcome Back",
                    style: TextStyle(
                      fontSize: 30,
                      fontWeight: FontWeight.bold,
                      color: StitchColors.onBackground,
                    ),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    "Please sign in to start your shift.",
                    style: TextStyle(
                      fontSize: 14,
                      color: StitchColors.secondary,
                    ),
                  ),
                  const SizedBox(height: 32),
                  Form(
                    key: _formKey,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Driver ID Field
                        const Text(
                          "DRIVER ID",
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                            color: StitchColors.onSurfaceVariant,
                            letterSpacing: 1.2,
                          ),
                        ),
                        const SizedBox(height: 8),
                        TextFormField(
                          controller: _usernameController,
                          enabled: !isLoading,
                          validator: (value) => value == null || value.isEmpty ? "Driver ID is required" : null,
                          decoration: InputDecoration(
                            prefixIcon: const Icon(Icons.badge, color: StitchColors.outline),
                            hintText: "Enter your ID",
                            filled: true,
                            fillColor: StitchColors.surfaceContainerLowest,
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(8.0),
                              borderSide: const BorderSide(color: StitchColors.outlineVariant),
                            ),
                            focusedBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(8.0),
                              borderSide: const BorderSide(color: StitchColors.primary, width: 2.0),
                            ),
                          ),
                        ),
                        const SizedBox(height: 20),

                        // Password/PIN Field
                        const Text(
                          "PIN/PASSWORD",
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                            color: StitchColors.onSurfaceVariant,
                            letterSpacing: 1.2,
                          ),
                        ),
                        const SizedBox(height: 8),
                        TextFormField(
                          controller: _passwordController,
                          obscureText: _obscurePassword,
                          enabled: !isLoading,
                          validator: (value) => value == null || value.isEmpty ? "PIN/Password is required" : null,
                          decoration: InputDecoration(
                            prefixIcon: const Icon(Icons.lock, color: StitchColors.outline),
                            hintText: "••••",
                            filled: true,
                            fillColor: StitchColors.surfaceContainerLowest,
                            suffixIcon: IconButton(
                              icon: Icon(
                                _obscurePassword ? Icons.visibility : Icons.visibility_off,
                                color: StitchColors.outline,
                              ),
                              onPressed: () {
                                setState(() {
                                  _obscurePassword = !_obscurePassword;
                                });
                              },
                            ),
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(8.0),
                              borderSide: const BorderSide(color: StitchColors.outlineVariant),
                            ),
                            focusedBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(8.0),
                              borderSide: const BorderSide(color: StitchColors.primary, width: 2.0),
                            ),
                          ),
                        ),
                        const SizedBox(height: 32),

                        // Submit Button
                        SizedBox(
                          width: double.infinity,
                          height: 56,
                          child: ElevatedButton(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: StitchColors.primaryContainer,
                              foregroundColor: StitchColors.onPrimary,
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(8.0),
                              ),
                            ),
                            onPressed: isLoading ? null : _handleLogin,
                            child: isLoading
                                 ? Row(
                                     mainAxisAlignment: MainAxisAlignment.center,
                                     children: [
                                       const SizedBox(
                                         width: 20,
                                         height: 20,
                                         child: CircularProgressIndicator(
                                           color: Colors.white,
                                           strokeWidth: 2.5,
                                         ),
                                       ),
                                       const SizedBox(width: 8),
                                       Flexible(
                                         child: Text(
                                           _loadingMessage.toUpperCase(),
                                           overflow: TextOverflow.ellipsis,
                                           maxLines: 1,
                                           style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
                                         ),
                                       ),
                                     ],
                                   )
                                : const Row(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      Text("LOG IN", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                                      SizedBox(width: 8),
                                      Icon(Icons.arrow_forward),
                                    ],
                                  ),
                          ),
                        ),
                        const SizedBox(height: 16),
                        Center(
                          child: TextButton(
                            onPressed: isLoading ? null : () {},
                            child: const Text(
                              "Forgot PIN or ID?",
                              style: TextStyle(
                                color: StitchColors.primary,
                                fontWeight: FontWeight.bold,
                                decoration: TextDecoration.underline,
                              ),
                            ),
                          ),
                        )
                      ],
                    ),
                  ),
                  const SizedBox(height: 32),

                  // Visual Status badges
                  Row(
                    children: [
                      Expanded(
                        child: Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: StitchColors.surfaceContainerHigh,
                            border: Border.all(color: StitchColors.outlineVariant),
                            borderRadius: BorderRadius.circular(8.0),
                          ),
                          child: const Column(
                            children: [
                              Icon(Icons.offline_pin, color: StitchColors.primary, size: 28),
                              SizedBox(height: 4),
                              Text("Offline Mode Ready", style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600)),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: StitchColors.surfaceContainerHigh,
                            border: Border.all(color: StitchColors.outlineVariant),
                            borderRadius: BorderRadius.circular(8.0),
                          ),
                          child: const Column(
                            children: [
                              Icon(Icons.sync_alt, color: StitchColors.primary, size: 28),
                              SizedBox(height: 4),
                              Text("Sync Status: OK", style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600)),
                            ],
                          ),
                        ),
                      )
                    ],
                  ),
                  const SizedBox(height: 12),
                  Center(
                    child: TextButton.icon(
                      onPressed: () async {
                        final token = PushNotificationService().fcmToken;
                        showDialog(
                          context: context,
                          builder: (ctx) => AlertDialog(
                            title: const Text("Firebase FCM Token"),
                            content: SelectableText(
                              token ?? "Token not generated yet. Ensure Google Play Services & Internet are active.",
                              style: const TextStyle(fontSize: 12, fontFamily: 'monospace'),
                            ),
                            actions: [
                              TextButton(
                                onPressed: () => Navigator.pop(ctx),
                                child: const Text("CLOSE"),
                              ),
                            ],
                          ),
                        );
                      },
                      icon: const Icon(Icons.notifications_active, size: 16, color: StitchColors.primary),
                      label: const Text("View FCM Push Token", style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: StitchColors.primary)),
                    ),
                  ),
                ],
              ),
            ),
          ),

          // Loading Overlay Backdrop
          if (isLoading)
            Container(
              color: Colors.black.withValues(alpha: 0.45),
              child: Center(
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 28),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    boxShadow: const [
                      BoxShadow(
                        color: Colors.black26,
                        blurRadius: 16,
                        offset: Offset(0, 4),
                      ),
                    ],
                  ),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const SizedBox(
                        width: 48,
                        height: 48,
                        child: CircularProgressIndicator(
                          color: StitchColors.primary,
                          strokeWidth: 4,
                        ),
                      ),
                      const SizedBox(height: 20),
                      Text(
                        _loadingMessage,
                        style: const TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.bold,
                          color: StitchColors.primary,
                        ),
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 6),
                      const Text(
                        "Please wait...",
                        style: TextStyle(fontSize: 12, color: StitchColors.secondary),
                      ),
                    ],
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}
