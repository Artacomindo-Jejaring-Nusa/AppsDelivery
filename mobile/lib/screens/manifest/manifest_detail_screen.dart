import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';

import '../../core/theme/colors.dart';
import '../../models/manifest_model.dart';
import '../../models/delivery_order_model.dart';
import '../../providers/manifest_provider.dart';
import '../../providers/sync_provider.dart';
import '../../providers/location_provider.dart';
import '../task/verification_screen.dart';

class ManifestDetailScreen extends StatefulWidget {
  final ManifestModel manifest;

  const ManifestDetailScreen({super.key, required this.manifest});

  @override
  State<ManifestDetailScreen> createState() => _ManifestDetailScreenState();
}

class _ManifestDetailScreenState extends State<ManifestDetailScreen> {
  Future<void> _refresh() async {
    final syncProv = Provider.of<SyncProvider>(context, listen: false);
    final manifestProv = Provider.of<ManifestProvider>(context, listen: false);
    final locProv = Provider.of<LocationProvider>(context, listen: false);
    if (locProv.driverId != null) {
      await manifestProv.fetchActiveManifest(locProv.driverId!, syncProv.isOnline);
    }
  }

  Color _getSlaColor(String slaStatus) {
    switch (slaStatus) {
      case 'red':
        return StitchColors.slaRed;
      case 'yellow':
        return StitchColors.slaYellow;
      case 'green':
      default:
        return StitchColors.slaGreen;
    }
  }

  Future<void> _startTransit(DeliveryOrderModel order) async {
    final syncProv = Provider.of<SyncProvider>(context, listen: false);
    final manifestProv = Provider.of<ManifestProvider>(context, listen: false);

    setState(() {}); // trigger loading indicator state in widget if needed

    final success = await manifestProv.updateDOStatus(
      doId: order.id,
      status: 'in_transit',
      notes: 'Driver started delivery transit.',
      isOnline: syncProv.isOnline,
    );

    if (mounted) {
      if (success) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text("${order.doNumber} status updated to In Transit")),
        );
        _refresh();
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text("Failed to update status. Stored offline.")),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final manifestProv = Provider.of<ManifestProvider>(context);
    final currentManifest = manifestProv.activeManifest ?? widget.manifest;

    return Scaffold(
      backgroundColor: StitchColors.background,
      appBar: AppBar(
        backgroundColor: StitchColors.surface,
        elevation: 0,
        iconTheme: const IconThemeData(color: StitchColors.primary),
        title: Text(
          currentManifest.manifestNumber,
          style: const TextStyle(color: StitchColors.primary, fontWeight: FontWeight.bold),
        ),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(1.0),
          child: Container(
            color: StitchColors.outlineVariant,
            height: 1.0,
          ),
        ),
      ),
      body: RefreshIndicator(
        onRefresh: _refresh,
        child: ListView.builder(
          padding: const EdgeInsets.all(16.0),
          itemCount: currentManifest.deliveryOrders.length,
          itemBuilder: (context, index) {
            final order = currentManifest.deliveryOrders[index];
            final deadlineText = order.slaDeadline != null
                ? DateFormat('dd MMM yyyy HH:mm').format(order.slaDeadline!)
                : '-';

            return Card(
              color: StitchColors.surfaceContainerLowest,
              elevation: 0,
              margin: const EdgeInsets.only(bottom: 16.0),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(8.0),
                side: const BorderSide(color: StitchColors.outlineVariant),
              ),
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Header row (DO Number & SLA status)
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          order.doNumber,
                          style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: StitchColors.primary),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: _getSlaColor(order.slaStatus),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Text(
                            "SLA ${order.slaStatus.toUpperCase()}",
                            style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),

                    // Site Info details
                    if (order.btsSite != null) ...[
                      Row(
                        children: [
                          const Icon(Icons.business, color: StitchColors.secondary, size: 18),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              "${order.btsSite!.siteId} - ${order.btsSite!.siteName}",
                              style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                    ],

                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Icon(Icons.calendar_today, color: StitchColors.secondary, size: 18),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            "Deadline: $deadlineText",
                            style: const TextStyle(fontSize: 13, color: StitchColors.onSurfaceVariant),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),

                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Icon(Icons.location_on_outlined, color: StitchColors.secondary, size: 18),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            "To: ${order.destinationAddress}",
                            style: const TextStyle(fontSize: 13, color: StitchColors.onSurfaceVariant),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),

                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Icon(Icons.info_outline, color: StitchColors.secondary, size: 18),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            "Status: ${order.status.toUpperCase()}",
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.bold,
                              color: order.status == 'delivered' || order.status == 'completed'
                                  ? StitchColors.slaGreen
                                  : StitchColors.primary,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),

                    // Actions
                    if (order.status == 'assigned')
                      SizedBox(
                        width: double.infinity,
                        height: 44,
                        child: ElevatedButton(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: StitchColors.primary,
                            foregroundColor: Colors.white,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8.0)),
                          ),
                          onPressed: () => _startTransit(order),
                          child: const Text("START TRANSIT", style: TextStyle(fontWeight: FontWeight.bold)),
                        ),
                      )
                    else if (order.status == 'in_transit')
                      SizedBox(
                        width: double.infinity,
                        height: 44,
                        child: ElevatedButton(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.green[700],
                            foregroundColor: Colors.white,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8.0)),
                          ),
                          onPressed: () {
                            Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (context) => VerificationScreen(
                                  order: order,
                                  manifestId: currentManifest.id,
                                ),
                              ),
                            ).then((_) => _refresh());
                          },
                          child: const Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(Icons.qr_code_scanner, size: 18),
                              SizedBox(width: 8),
                              Text("VERIFY & COMPLETE DELIVERY", style: TextStyle(fontWeight: FontWeight.bold)),
                            ],
                          ),
                        ),
                      )
                    else
                      const Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.check_circle, color: StitchColors.slaGreen),
                          SizedBox(width: 8),
                          Text(
                            "Delivery Completed",
                            style: TextStyle(color: StitchColors.slaGreen, fontWeight: FontWeight.bold),
                          ),
                        ],
                      )
                  ],
                ),
              ),
            );
          },
        ),
      ),
    );
  }
}
