import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../../core/theme/colors.dart';
import '../../providers/manifest_provider.dart';

class HistoryDetailScreen extends StatefulWidget {
  final Map<String, dynamic> manifestData;

  const HistoryDetailScreen({super.key, required this.manifestData});

  @override
  State<HistoryDetailScreen> createState() => _HistoryDetailScreenState();
}

class _HistoryDetailScreenState extends State<HistoryDetailScreen> {
  bool _isLoading = true;
  Map<String, dynamic>? _fullManifest;
  List<dynamic> _deliveryOrders = [];

  @override
  void initState() {
    super.initState();
    _loadFullManifest();
  }

  Future<void> _loadFullManifest() async {
    setState(() => _isLoading = true);

    try {
      final manifestProv = Provider.of<ManifestProvider>(context, listen: false);
      final manifestId = widget.manifestData['id'];
      final response = await manifestProv.apiClient.dio.get('/api/v1/manifests/$manifestId');

      if (response.statusCode == 200) {
        final data = response.data['data'];
        setState(() {
          _fullManifest = data;
          // Extract delivery orders from manifest items
          final items = data['items'] as List? ?? [];
          _deliveryOrders = items
              .where((item) => item['delivery_order'] != null)
              .map((item) => item['delivery_order'])
              .toList();
        });
      }
    } catch (e) {
      debugPrint("Failed to load manifest detail: $e");
      // Fallback to basic data from the list
      setState(() {
        _fullManifest = widget.manifestData;
        final items = widget.manifestData['items'] as List? ?? [];
        _deliveryOrders = items
            .where((item) => item['delivery_order'] != null)
            .map((item) => item['delivery_order'])
            .toList();
      });
    } finally {
      setState(() => _isLoading = false);
    }
  }

  Color _getStatusColor(String status) {
    switch (status.toLowerCase()) {
      case 'delivered':
        return const Color(0xFF2E7D32);
      case 'completed':
        return StitchColors.primary;
      case 'in_transit':
        return const Color(0xFFE65100);
      case 'cancelled':
        return StitchColors.error;
      default:
        return StitchColors.secondary;
    }
  }

  IconData _getStatusIcon(String status) {
    switch (status.toLowerCase()) {
      case 'delivered':
        return Icons.local_shipping;
      case 'completed':
        return Icons.check_circle;
      case 'in_transit':
        return Icons.directions_car;
      case 'cancelled':
        return Icons.cancel;
      default:
        return Icons.pending;
    }
  }

  String _formatDate(String? dateStr) {
    if (dateStr == null || dateStr.isEmpty) return '-';
    try {
      return DateFormat('dd MMM yyyy, HH:mm').format(DateTime.parse(dateStr));
    } catch (_) {
      return dateStr;
    }
  }

  @override
  Widget build(BuildContext context) {
    final manifestNo = widget.manifestData['manifest_number'] ?? '';
    final status = (_fullManifest?['status'] ?? widget.manifestData['status'] ?? '').toString();

    return Scaffold(
      backgroundColor: StitchColors.background,
      appBar: AppBar(
        backgroundColor: StitchColors.surface,
        elevation: 0,
        iconTheme: const IconThemeData(color: StitchColors.primary),
        title: Text(
          manifestNo,
          style: const TextStyle(color: StitchColors.primary, fontWeight: FontWeight.bold, fontSize: 16),
        ),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(1.0),
          child: Container(color: StitchColors.outlineVariant, height: 1.0),
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _loadFullManifest,
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Manifest Summary Card
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(16.0),
                      decoration: BoxDecoration(
                        color: StitchColors.primary,
                        borderRadius: BorderRadius.circular(12.0),
                        boxShadow: const [
                          BoxShadow(color: Colors.black12, blurRadius: 6, offset: Offset(0, 3)),
                        ],
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                manifestNo,
                                style: const TextStyle(
                                  color: Colors.white70,
                                  fontSize: 12,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                decoration: BoxDecoration(
                                  color: Colors.white24,
                                  borderRadius: BorderRadius.circular(4.0),
                                ),
                                child: Text(
                                  status.toUpperCase(),
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 10,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 8),
                          Text(
                            "${_deliveryOrders.length} Delivery Order${_deliveryOrders.length != 1 ? 's' : ''}",
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const Divider(color: Colors.white24, height: 20),
                          Row(
                            children: [
                              const Icon(Icons.calendar_today, color: Colors.white70, size: 14),
                              const SizedBox(width: 8),
                              Text(
                                "Completed: ${_formatDate((_fullManifest?['completed_date'] ?? _fullManifest?['updated_at'])?.toString())}",
                                style: const TextStyle(color: Colors.white70, fontSize: 12),
                              ),
                            ],
                          ),
                          if (_fullManifest?['driver'] != null) ...[
                            const SizedBox(height: 6),
                            Row(
                              children: [
                                const Icon(Icons.person, color: Colors.white70, size: 14),
                                const SizedBox(width: 8),
                                Text(
                                  "Driver: ${_fullManifest!['driver']['full_name'] ?? 'Unknown'}",
                                  style: const TextStyle(color: Colors.white70, fontSize: 12),
                                ),
                              ],
                            ),
                          ],
                        ],
                      ),
                    ),
                    const SizedBox(height: 20),

                    // Delivery Orders Section Header
                    const Text(
                      "DELIVERY ORDERS",
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                        color: StitchColors.onSurfaceVariant,
                        letterSpacing: 1.2,
                      ),
                    ),
                    const SizedBox(height: 12),

                    // DO List
                    if (_deliveryOrders.isEmpty)
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(24),
                        decoration: BoxDecoration(
                          color: StitchColors.surfaceContainerLowest,
                          border: Border.all(color: StitchColors.outlineVariant),
                          borderRadius: BorderRadius.circular(12.0),
                        ),
                        child: const Column(
                          children: [
                            Icon(Icons.inbox_outlined, color: StitchColors.outline, size: 40),
                            SizedBox(height: 8),
                            Text("No delivery order details available",
                              style: TextStyle(color: StitchColors.secondary)),
                          ],
                        ),
                      )
                    else
                      ..._deliveryOrders.map((doData) {
                        final doNumber = doData['do_number'] ?? '';
                        final doStatus = (doData['status'] ?? '').toString();
                        final description = doData['description'] ?? '';
                        final destAddr = doData['destination_address'] ?? '';
                        final notes = doData['notes'] ?? '';
                        final slaDeadline = doData['sla_deadline']?.toString();
                        final btsSite = doData['bts_site'];

                        return Container(
                          margin: const EdgeInsets.only(bottom: 12.0),
                          padding: const EdgeInsets.all(16.0),
                          decoration: BoxDecoration(
                            color: StitchColors.surfaceContainerLowest,
                            border: Border.all(color: StitchColors.outlineVariant),
                            borderRadius: BorderRadius.circular(12.0),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              // DO Header
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        const Text(
                                          "DO NUMBER",
                                          style: TextStyle(
                                            color: StitchColors.onSurfaceVariant,
                                            fontSize: 10,
                                            fontWeight: FontWeight.bold,
                                          ),
                                        ),
                                        Text(
                                          doNumber,
                                          style: const TextStyle(
                                            fontFamily: 'JetBrains Mono',
                                            fontSize: 14,
                                            fontWeight: FontWeight.bold,
                                            color: StitchColors.primary,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                    decoration: BoxDecoration(
                                      color: _getStatusColor(doStatus).withValues(alpha: 0.12),
                                      borderRadius: BorderRadius.circular(4.0),
                                    ),
                                    child: Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        Icon(_getStatusIcon(doStatus), size: 12, color: _getStatusColor(doStatus)),
                                        const SizedBox(width: 4),
                                        Text(
                                          doStatus.toUpperCase(),
                                          style: TextStyle(
                                            color: _getStatusColor(doStatus),
                                            fontSize: 10,
                                            fontWeight: FontWeight.bold,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                              const Divider(color: StitchColors.outlineVariant, height: 20),

                              // Description
                              if (description.isNotEmpty) ...[
                                Row(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const Icon(Icons.description_outlined, color: StitchColors.secondary, size: 16),
                                    const SizedBox(width: 8),
                                    Expanded(
                                      child: Text(
                                        description,
                                        style: const TextStyle(fontSize: 13, color: StitchColors.onSurfaceVariant),
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 8),
                              ],

                              // BTS Site
                              if (btsSite != null) ...[
                                Row(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const Icon(Icons.cell_tower, color: StitchColors.secondary, size: 16),
                                    const SizedBox(width: 8),
                                    Expanded(
                                      child: Text(
                                        "${btsSite['site_id'] ?? ''} - ${btsSite['site_name'] ?? ''}",
                                        style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 8),
                              ],

                              // Destination
                              if (destAddr.isNotEmpty) ...[
                                Row(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const Icon(Icons.location_on_outlined, color: StitchColors.secondary, size: 16),
                                    const SizedBox(width: 8),
                                    Expanded(
                                      child: Text(
                                        destAddr,
                                        style: const TextStyle(fontSize: 13, color: StitchColors.onSurfaceVariant),
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 8),
                              ],

                              // SLA Deadline
                              if (slaDeadline != null) ...[
                                Row(
                                  children: [
                                    const Icon(Icons.timer_outlined, color: StitchColors.secondary, size: 16),
                                    const SizedBox(width: 8),
                                    Text(
                                      "Deadline: ${_formatDate(slaDeadline)}",
                                      style: const TextStyle(fontSize: 12, color: StitchColors.onSurfaceVariant),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 8),
                              ],

                              // Notes
                              if (notes.isNotEmpty) ...[
                                Row(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const Icon(Icons.note_outlined, color: StitchColors.secondary, size: 16),
                                    const SizedBox(width: 8),
                                    Expanded(
                                      child: Text(
                                        notes,
                                        style: const TextStyle(fontSize: 12, color: StitchColors.outline, fontStyle: FontStyle.italic),
                                        maxLines: 3,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                    ),
                                  ],
                                ),
                              ],

                              // Completed indicator
                              if (doStatus == 'delivered' || doStatus == 'completed') ...[
                                const SizedBox(height: 12),
                                const Row(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    Icon(Icons.check_circle, color: Color(0xFF2E7D32), size: 18),
                                    SizedBox(width: 6),
                                    Text(
                                      "Delivery Completed",
                                      style: TextStyle(
                                        color: Color(0xFF2E7D32),
                                        fontWeight: FontWeight.bold,
                                        fontSize: 13,
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ],
                          ),
                        );
                      }),
                  ],
                ),
              ),
            ),
    );
  }
}
