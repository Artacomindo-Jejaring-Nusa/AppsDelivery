import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';

import '../../core/theme/colors.dart';
import '../../providers/manifest_provider.dart';
import '../../providers/location_provider.dart';
import '../../providers/sync_provider.dart';
import 'history_detail_screen.dart';

class HistoryTab extends StatefulWidget {
  const HistoryTab({super.key});

  @override
  State<HistoryTab> createState() => _HistoryTabState();
}

class _HistoryTabState extends State<HistoryTab> {
  bool _isLoading = false;
  List<dynamic> _completedManifests = [];

  @override
  void initState() {
    super.initState();
    _loadHistory();
  }

  Future<void> _loadHistory() async {
    setState(() {
      _isLoading = true;
    });

    final locProv = Provider.of<LocationProvider>(context, listen: false);
    final manifestProv = Provider.of<ManifestProvider>(context, listen: false);
    final syncProv = Provider.of<SyncProvider>(context, listen: false);

    debugPrint("HISTORY: driverId = ${locProv.driverId}");

    try {
      if (syncProv.isOnline) {
        final response = await manifestProv.apiClient.dio.get('/api/v1/manifests?per_page=100');
        debugPrint("HISTORY: API status = ${response.statusCode}");
        if (response.statusCode == 200) {
          final list = response.data['data'] as List;
          debugPrint("HISTORY: Total manifests from API = ${list.length}");
          for (var item in list) {
            debugPrint("HISTORY: manifest=${item['manifest_number']}, status=${item['status']}, driver_id=${item['driver_id']?.toString()}");
          }
          setState(() {
            _completedManifests = list.where((item) {
              final mDriverId = item['driver_id']?.toString() ?? '';
              final mStatus = (item['status'] ?? '').toString().toLowerCase();
              // Match driver: if we have a driverId, compare; otherwise show all
              final myDriverId = locProv.driverId ?? '';
              final isDriverMatch = myDriverId.isEmpty || mDriverId == myDriverId;
              // Show manifests that are completed or delivered
              final isFinished = mStatus == 'completed' || mStatus == 'delivered';
              debugPrint("HISTORY FILTER: manifest=${item['manifest_number']}, driverMatch=$isDriverMatch (api=$mDriverId vs local=$myDriverId), finished=$isFinished");
              return isDriverMatch && isFinished;
            }).toList();
            debugPrint("HISTORY: Filtered result count = ${_completedManifests.length}");
          });
        }
      } else {
        // Offline cache fallback
        final cached = await manifestProv.dbHelper.getCachedManifest();
        if (cached != null && (cached['status'] == 'completed' || cached['status'] == 'delivered')) {
          setState(() {
            _completedManifests = [cached];
          });
        }
      }
    } catch (e) {
      debugPrint("Failed to fetch history manifests: $e");
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_completedManifests.isEmpty) {
      return RefreshIndicator(
        onRefresh: _loadHistory,
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          child: Container(
            height: MediaQuery.of(context).size.height * 0.6,
            alignment: Alignment.center,
            padding: const EdgeInsets.all(32.0),
            child: const Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.history_toggle_off, color: StitchColors.outline, size: 64),
                SizedBox(height: 16),
                Text(
                  "No Completed Trips",
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                ),
                SizedBox(height: 8),
                Text(
                  "Manifests you complete will appear here.",
                  style: TextStyle(color: StitchColors.secondary, fontSize: 13),
                  textAlign: TextAlign.center,
                ),
              ],
            ),
          ),
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _loadHistory,
      child: ListView.builder(
        padding: const EdgeInsets.all(16.0),
        itemCount: _completedManifests.length,
        itemBuilder: (context, index) {
          final item = _completedManifests[index];
          final manifestNo = item['manifest_number'] ?? '';
          final status = (item['status'] ?? '').toString();
          final items = item['items'] as List? ?? [];
          final totalDOs = items.length;
          final dateStr = (item['completed_date'] ?? item['updated_at'] ?? '').toString();
          String formattedDate = '-';
          try {
            if (dateStr.isNotEmpty) {
              formattedDate = DateFormat('dd MMM yyyy, HH:mm').format(DateTime.parse(dateStr));
            }
          } catch (_) {}

          return Card(
            color: StitchColors.surfaceContainerLowest,
            elevation: 0,
            margin: const EdgeInsets.only(bottom: 12.0),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12.0),
              side: const BorderSide(color: StitchColors.outlineVariant),
            ),
            child: InkWell(
              borderRadius: BorderRadius.circular(12.0),
              onTap: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (context) => HistoryDetailScreen(manifestData: item),
                  ),
                );
              },
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        const CircleAvatar(
                          backgroundColor: StitchColors.secondaryContainer,
                          child: Icon(Icons.check, color: StitchColors.primary),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                manifestNo,
                                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                "$totalDOs Delivery Order${totalDOs != 1 ? 's' : ''}",
                                style: const TextStyle(color: StitchColors.secondary, fontSize: 12),
                              ),
                            ],
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: status == 'completed'
                                ? StitchColors.secondaryContainer
                                : const Color(0xFFE8F5E9),
                            borderRadius: BorderRadius.circular(4.0),
                          ),
                          child: Text(
                            status.toUpperCase(),
                            style: TextStyle(
                              color: status == 'completed'
                                  ? StitchColors.primary
                                  : const Color(0xFF2E7D32),
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        const Icon(Icons.chevron_right, color: StitchColors.outline),
                      ],
                    ),
                    const Divider(color: StitchColors.outlineVariant, height: 24),
                    Row(
                      children: [
                        const Icon(Icons.calendar_today, size: 14, color: StitchColors.outline),
                        const SizedBox(width: 8),
                        Text(
                          formattedDate,
                          style: const TextStyle(color: StitchColors.secondary, fontSize: 12),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}
