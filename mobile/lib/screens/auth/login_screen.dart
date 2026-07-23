import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

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
              onPressed: () {
                authProv.apiClient.setBaseUrl(urlController.text.trim());
                Navigator.pop(context);
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text("Base URL updated to: ${urlController.text.trim()}")),
                );
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

    final authProv = Provider.of<AuthProvider>(context, listen: false);
    final locProv = Provider.of<LocationProvider>(context, listen: false);

    final success = await authProv.login(
      _usernameController.text.trim(),
      _passwordController.text,
    );

    if (success && mounted) {
      // 1. Initial GPS ping to resolve driver_id
      await locProv.pingLocation();
      
      if (mounted) {
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(builder: (context) => const HomeScreen()),
        );
      }
    } else if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(authProv.errorMessage ?? "Authentication failed"),
          backgroundColor: StitchColors.error,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final authProv = Provider.of<AuthProvider>(context);

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
      body: Center(
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
                        onPressed: authProv.isLoading ? null : _handleLogin,
                        child: authProv.isLoading
                            ? const Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  SizedBox(
                                    width: 20,
                                    height: 20,
                                    child: CircularProgressIndicator(
                                      color: Colors.white,
                                      strokeWidth: 2,
                                    ),
                                  ),
                                  SizedBox(width: 12),
                                  Text("AUTHENTICATING...", style: TextStyle(fontWeight: FontWeight.bold)),
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
                        onPressed: () {},
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
              )
            ],
          ),
        ),
      ),
    );
  }
}
