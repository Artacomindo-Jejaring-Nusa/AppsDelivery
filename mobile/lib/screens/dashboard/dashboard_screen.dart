import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/theme/colors.dart';
import '../../providers/auth_provider.dart';
import '../../providers/location_provider.dart';
import '../../providers/manifest_provider.dart';
import '../../providers/sync_provider.dart';
import '../auth/login_screen.dart';
import '../manifest/manifest_detail_screen.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadData();
    });
  }

  Future<void> _loadData() async {
    final locProv = Provider.of<LocationProvider>(context, listen: false);
    final manifestProv = Provider.of<ManifestProvider>(context, listen: false);
    final syncProv = Provider.of<SyncProvider>(context, listen: false);

    // 1. Resolve Driver ID via coordinate ping
    final driverId = await locProv.pingLocation();
    
    // 2. Fetch manifest if driverId exists
    if (driverId != null) {
      await manifestProv.fetchActiveManifest(driverId, syncProv.isOnline);
    }
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
    final locProv = Provider.of<LocationProvider>(context);
    final manifestProv = Provider.of<ManifestProvider>(context);
    final syncProv = Provider.of<SyncProvider>(context);

    final String driverName = authProv.user?.fullName ?? "Driver Courier";
    final String driverUsername = authProv.user?.username ?? "";

    return Scaffold(
      backgroundColor: StitchColors.background,
      appBar: AppBar(
        backgroundColor: StitchColors.surface,
        elevation: 0,
        title: const Text(
          "Driver Dashboard",
          style: TextStyle(color: StitchColors.primary, fontWeight: FontWeight.bold),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.sync, color: StitchColors.primary),
            onPressed: () {
              _loadData();
              syncProv.syncNow();
            },
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
      body: RefreshIndicator(
        onRefresh: _loadData,
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // 1. Driver Info Card
              Card(
                color: StitchColors.surfaceContainerLowest,
                elevation: 0,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(8.0),
                  side: const BorderSide(color: StitchColors.outlineVariant),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Row(
                    children: [
                      const CircleAvatar(
                        radius: 30,
                        backgroundColor: StitchColors.primaryFixed,
                        child: Icon(Icons.person, color: StitchColors.primary, size: 36),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              driverName,
                              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              "Username: $driverUsername",
                              style: const TextStyle(color: StitchColors.secondary, fontSize: 13),
                            ),
                            if (locProv.driverId != null) ...[
                              const SizedBox(height: 2),
                              Text(
                                "Driver ID: ${locProv.driverId!.substring(0, 8)}...",
                                style: const TextStyle(color: StitchColors.secondary, fontSize: 12),
                              ),
                            ]
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 20),

              // 2. Active Duty Toggle & GPS Status
              Card(
                color: StitchColors.surfaceContainerLowest,
                elevation: 0,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(8.0),
                  side: const BorderSide(color: StitchColors.outlineVariant),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Row(
                            children: [
                              Icon(Icons.location_on, color: StitchColors.primary),
                              SizedBox(width: 8),
                              Text(
                                "Shift GPS Tracking",
                                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
                              ),
                            ],
                          ),
                          Switch(
                            value: locProv.isTracking,
                            activeThumbColor: StitchColors.primary,
                            onChanged: (val) {
                              if (val) {
                                locProv.startTracking();
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(content: Text("GPS tracking shift started.")),
                                );
                              } else {
                                locProv.stopTracking();
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(content: Text("GPS tracking shift stopped.")),
                                );
                              }
                            },
                          ),
                        ],
                      ),
                      const Divider(color: StitchColors.outlineVariant),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text("Sync Status", style: TextStyle(color: StitchColors.secondary)),
                          Row(
                            children: [
                              Container(
                                width: 10,
                                height: 10,
                                decoration: BoxDecoration(
                                  color: syncProv.isOnline ? Colors.green : Colors.orange,
                                  shape: BoxShape.circle,
                                ),
                              ),
                              const SizedBox(width: 8),
                              Text(
                                syncProv.isOnline ? "Online Mode" : "Offline Mode",
                                style: const TextStyle(fontWeight: FontWeight.bold),
                              ),
                            ],
                          ),
                        ],
                      ),
                      if (syncProv.pendingCount > 0) ...[
                        const SizedBox(height: 8),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text("Tasks Queued Offline", style: TextStyle(color: StitchColors.secondary)),
                            Chip(
                              label: Text(
                                "${syncProv.pendingCount} Pending",
                                style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold),
                              ),
                              backgroundColor: StitchColors.slaRed,
                              padding: EdgeInsets.zero,
                              visualDensity: VisualDensity.compact,
                            ),
                          ],
                        ),
                      ]
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 24),

              // 3. Active Manifest Info
              const Text(
                "YOUR ASSIGNED TASK",
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                  color: StitchColors.onSurfaceVariant,
                  letterSpacing: 1.2,
                ),
              ),
              const SizedBox(height: 12),

              if (manifestProv.isLoading)
                const Center(
                  child: Padding(
                    padding: EdgeInsets.all(32.0),
                    child: CircularProgressIndicator(),
                  ),
                )
              else if (manifestProv.activeManifest == null)
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(24),
                  decoration: BoxDecoration(
                    color: StitchColors.surfaceContainerLowest,
                    border: Border.all(color: StitchColors.outlineVariant),
                    borderRadius: BorderRadius.circular(8.0),
                  ),
                  child: const Column(
                    children: [
                      Icon(Icons.assignment_turned_in_outlined, color: StitchColors.outline, size: 48),
                      SizedBox(height: 12),
                      Text(
                        "No Active Manifest Assigned",
                        style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                      ),
                      SizedBox(height: 4),
                      Text(
                        "Please check with dispatcher or refresh.",
                        style: TextStyle(color: StitchColors.secondary, fontSize: 13),
                        textAlign: TextAlign.center,
                      ),
                    ],
                  ),
                )
              else
                Card(
                  color: StitchColors.surfaceContainerLowest,
                  elevation: 0,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8.0),
                    side: const BorderSide(color: StitchColors.outlineVariant),
                  ),
                  child: Padding(
                    padding: const EdgeInsets.all(16.0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              manifestProv.activeManifest!.manifestNumber,
                              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: StitchColors.primary),
                            ),
                            Chip(
                              label: Text(
                                manifestProv.activeManifest!.status.toUpperCase(),
                                style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold),
                              ),
                              backgroundColor: StitchColors.primaryFixed,
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Text(
                          "Total Delivery Orders: ${manifestProv.activeManifest!.deliveryOrders.length}",
                          style: const TextStyle(fontWeight: FontWeight.w500),
                        ),
                        if (manifestProv.activeManifest!.notes.isNotEmpty) ...[
                          const SizedBox(height: 8),
                          Text(
                            "Notes: ${manifestProv.activeManifest!.notes}",
                            style: const TextStyle(color: StitchColors.secondary, fontSize: 13),
                          ),
                        ],
                        const SizedBox(height: 16),
                        SizedBox(
                          width: double.infinity,
                          height: 48,
                          child: ElevatedButton(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: StitchColors.primary,
                              foregroundColor: Colors.white,
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8.0)),
                            ),
                            onPressed: () {
                              Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (context) => ManifestDetailScreen(
                                    manifest: manifestProv.activeManifest!,
                                  ),
                                ),
                              );
                            },
                            child: const Text("VIEW MANIFEST TASK LIST", style: TextStyle(fontWeight: FontWeight.bold)),
                          ),
                        )
                      ],
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
