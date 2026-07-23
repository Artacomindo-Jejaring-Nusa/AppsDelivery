import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/theme/colors.dart';
import '../../providers/auth_provider.dart';
import '../../providers/location_provider.dart';
import '../../providers/sync_provider.dart';
import '../../providers/manifest_provider.dart';
import '../auth/login_screen.dart';
import '../dashboard/trips_tab.dart';
import '../dashboard/scanner_tab.dart';
import '../dashboard/history_tab.dart';
import '../dashboard/sync_tab.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _currentIndex = 0;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadInitialData();
    });
  }

  Future<void> _loadInitialData() async {
    final locProv = Provider.of<LocationProvider>(context, listen: false);
    final manifestProv = Provider.of<ManifestProvider>(context, listen: false);
    final syncProv = Provider.of<SyncProvider>(context, listen: false);

    // Ping location to resolve driver ID
    final driverId = await locProv.pingLocation();
    if (driverId != null) {
      await manifestProv.fetchActiveManifest(driverId, syncProv.isOnline);
    }
  }

  void selectTab(int index) {
    setState(() {
      _currentIndex = index;
    });
  }

  Future<void> _handleLogout() async {
    final authProv = Provider.of<AuthProvider>(context, listen: false);
    final locProv = Provider.of<LocationProvider>(context, listen: false);

    locProv.stopTracking();
    await authProv.logout();

    if (mounted) {
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(builder: (context) => const LoginScreen()),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final authProv = Provider.of<AuthProvider>(context);
    final syncProv = Provider.of<SyncProvider>(context);

    final List<Widget> tabs = [
      TripsTab(onSelectTab: selectTab),
      const ScannerTab(),
      const HistoryTab(),
      const SyncTab(),
    ];

    return Scaffold(
      backgroundColor: StitchColors.background,
      appBar: AppBar(
        backgroundColor: StitchColors.surfaceContainerLowest,
        elevation: 0,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              "Active Trips",
              style: TextStyle(
                color: StitchColors.primary,
                fontWeight: FontWeight.bold,
                fontSize: 20,
              ),
            ),
            Text(
              authProv.user != null ? "Driver: ${authProv.user!.fullName}" : "",
              style: const TextStyle(
                color: StitchColors.secondary,
                fontSize: 12,
              ),
            ),
          ],
        ),
        actions: [
          // Sync status pill in header
          Padding(
            padding: const EdgeInsets.only(right: 8.0),
            child: Chip(
              avatar: Icon(
                syncProv.isOnline ? Icons.cloud_done : Icons.cloud_off,
                color: StitchColors.primary,
                size: 16,
              ),
              label: Text(
                syncProv.isOnline ? "Synced" : "Offline",
                style: const TextStyle(
                  color: StitchColors.primary,
                  fontSize: 11,
                  fontWeight: FontWeight.bold,
                ),
              ),
              backgroundColor: StitchColors.secondaryContainer,
              side: BorderSide.none,
              visualDensity: VisualDensity.compact,
            ),
          ),
          IconButton(
            icon: const Icon(Icons.logout, color: StitchColors.error),
            onPressed: _handleLogout,
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
      body: IndexedStack(
        index: _currentIndex,
        children: tabs,
      ),
      bottomNavigationBar: Container(
        decoration: const BoxDecoration(
          border: Border(
            top: BorderSide(color: StitchColors.outlineVariant, width: 1.0),
          ),
        ),
        child: BottomNavigationBar(
          currentIndex: _currentIndex,
          onTap: selectTab,
          type: BottomNavigationBarType.fixed,
          backgroundColor: StitchColors.surfaceContainerLowest,
          selectedItemColor: StitchColors.primary,
          unselectedItemColor: StitchColors.secondary,
          selectedLabelStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
          unselectedLabelStyle: const TextStyle(fontWeight: FontWeight.w500, fontSize: 12),
          items: const [
            BottomNavigationBarItem(
              icon: Icon(Icons.local_shipping),
              activeIcon: Icon(Icons.local_shipping, color: StitchColors.primary),
              label: 'Trips',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.qr_code_scanner),
              activeIcon: Icon(Icons.qr_code_scanner, color: StitchColors.primary),
              label: 'Scanner',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.history),
              activeIcon: Icon(Icons.history, color: StitchColors.primary),
              label: 'History',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.sync),
              activeIcon: Icon(Icons.sync, color: StitchColors.primary),
              label: 'Sync',
            ),
          ],
        ),
      ),
    );
  }
}
