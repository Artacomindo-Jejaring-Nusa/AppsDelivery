import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';

import '../../core/theme/colors.dart';
import '../../providers/manifest_provider.dart';
import '../../providers/location_provider.dart';
import '../../providers/sync_provider.dart';

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

    if (locProv.driverId == null) {
      setState(() {
        _isLoading = false;
      });
      return;
    }

    try {
      if (syncProv.isOnline) {
        final response = await manifestProv.apiClient.dio.get('/api/v1/manifests?per_page=100');
        if (response.statusCode == 200) {
          final list = response.data['data'] as List;
          setState(() {
            _completedManifests = list.where((item) {
              final mDriverId = item['driver_id'] ?? '';
              final mStatus = item['status'] ?? '';
              final isDriverMatch = locProv.driverId == null ||
                  locProv.driverId!.isEmpty ||
                  mDriverId == locProv.driverId;
              final isFinished = mStatus == 'completed' || mStatus == 'delivered';
              return isDriverMatch && isFinished;
            }).toList();
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
          final dateStr = item['completed_date'] ?? item['updated_at'] ?? '';
          final formattedDate = dateStr.isNotEmpty
              ? DateFormat('dd MMM yyyy HH:mm').format(DateTime.parse(dateStr))
              : '-';

          return Card(
            color: StitchColors.surfaceContainerLowest,
            elevation: 0,
            margin: const EdgeInsets.only(bottom: 12.0),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12.0),
              side: const BorderSide(color: StitchColors.outlineVariant),
            ),
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Row(
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
                        const SizedBox(height: 4),
                        Text(
                          "Completed: $formattedDate",
                          style: const TextStyle(color: StitchColors.secondary, fontSize: 12),
                        ),
                      ],
                    ),
                  ),
                  const Icon(Icons.arrow_forward_ios, color: StitchColors.outline, size: 16),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}
