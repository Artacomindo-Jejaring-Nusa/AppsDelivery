import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/theme/colors.dart';
import '../../providers/location_provider.dart';
import '../../providers/manifest_provider.dart';
import '../../providers/sync_provider.dart';
import '../manifest/manifest_detail_screen.dart';

class TripsTab extends StatefulWidget {
  final Function(int) onSelectTab;

  const TripsTab({super.key, required this.onSelectTab});

  @override
  State<TripsTab> createState() => _TripsTabState();
}

class _TripsTabState extends State<TripsTab> {
  Future<void> _refresh() async {
    final syncProv = Provider.of<SyncProvider>(context, listen: false);
    final manifestProv = Provider.of<ManifestProvider>(context, listen: false);
    final locProv = Provider.of<LocationProvider>(context, listen: false);
    await manifestProv.fetchActiveManifest(
      locProv.driverId,
      syncProv.isOnline,
    );
  }

  @override
  Widget build(BuildContext context) {
    final manifestProv = Provider.of<ManifestProvider>(context);

    final manifest = manifestProv.activeManifest;

    return RefreshIndicator(
      onRefresh: _refresh,
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 1. Bento Stats Bento layout
            Row(
              children: [
                Expanded(
                  child: Container(
                    height: 96,
                    padding: const EdgeInsets.all(16.0),
                    decoration: BoxDecoration(
                      color: StitchColors.surfaceContainerLowest,
                      border: Border.all(color: StitchColors.outlineVariant),
                      borderRadius: BorderRadius.circular(12.0),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          "Remaining",
                          style: TextStyle(
                            color: StitchColors.onSurfaceVariant,
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.baseline,
                          textBaseline: TextBaseline.alphabetic,
                          children: [
                            Text(
                              manifest != null ? "342" : "0",
                              style: const TextStyle(
                                fontSize: 24,
                                fontWeight: FontWeight.bold,
                                color: StitchColors.primary,
                              ),
                            ),
                            const SizedBox(width: 4),
                            const Text(
                              "KM",
                              style: TextStyle(
                                fontSize: 11,
                                color: StitchColors.outline,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Container(
                    height: 96,
                    padding: const EdgeInsets.all(16.0),
                    decoration: BoxDecoration(
                      color: StitchColors.surfaceContainerLowest,
                      border: Border.all(color: StitchColors.outlineVariant),
                      borderRadius: BorderRadius.circular(12.0),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          "SLA Health",
                          style: TextStyle(
                            color: StitchColors.onSurfaceVariant,
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        Row(
                          children: [
                            Text(
                              manifest != null ? "98%" : "100%",
                              style: const TextStyle(
                                fontSize: 24,
                                fontWeight: FontWeight.bold,
                                color: StitchColors.primary,
                              ),
                            ),
                            const SizedBox(width: 8),
                            Container(
                              width: 8,
                              height: 8,
                              decoration: const BoxDecoration(
                                color: StitchColors.slaYellow,
                                shape: BoxShape.circle,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 20),

            // 2. Priority Queue Title & Refresh
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  "PRIORITY QUEUE",
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    color: StitchColors.onSurfaceVariant,
                    letterSpacing: 1.2,
                  ),
                ),
                GestureDetector(
                  onTap: _refresh,
                  child: const Text(
                    "Refresh",
                    style: TextStyle(
                      fontSize: 12,
                      color: StitchColors.primary,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),

            // Empty state check
            if (manifest == null)
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
                    Icon(
                      Icons.assignment_turned_in_outlined,
                      color: StitchColors.outline,
                      size: 48,
                    ),
                    SizedBox(height: 12),
                    Text(
                      "No Active Manifest Assigned",
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    SizedBox(height: 4),
                    Text(
                      "Please contact your dispatcher to request a task.",
                      style: TextStyle(
                        color: StitchColors.secondary,
                        fontSize: 13,
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ],
                ),
              )
            else ...[
              // Manifest details page shortcut card
              InkWell(
                onTap: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (context) =>
                          ManifestDetailScreen(manifest: manifest),
                    ),
                  ).then((_) => _refresh());
                },
                child: Container(
                  width: double.infinity,
                  margin: const EdgeInsets.only(bottom: 12.0),
                  padding: const EdgeInsets.all(16.0),
                  decoration: BoxDecoration(
                    color: StitchColors.primary,
                    borderRadius: BorderRadius.circular(12.0),
                    boxShadow: const [
                      BoxShadow(
                        color: Colors.black12,
                        blurRadius: 6,
                        offset: Offset(0, 3),
                      ),
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                "MANIFEST ${manifest.manifestNumber}",
                                style: const TextStyle(
                                  color: Colors.white70,
                                  fontSize: 11,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                "${manifest.deliveryOrders.length} Shipments Assigned",
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 16,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ],
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 8,
                              vertical: 4,
                            ),
                            decoration: BoxDecoration(
                              color: StitchColors.primaryContainer,
                              borderRadius: BorderRadius.circular(4.0),
                            ),
                            child: const Text(
                              "NEXT UP",
                              style: TextStyle(
                                color: Colors.white,
                                fontSize: 10,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const Divider(color: Colors.white24, height: 24),
                      const Row(
                        children: [
                          Icon(
                            Icons.location_on,
                            color: Colors.white,
                            size: 20,
                          ),
                          SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              "Tap to open full manifest task list",
                              style: TextStyle(
                                color: Colors.white,
                                fontSize: 14,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                          Icon(
                            Icons.arrow_forward_ios,
                            color: Colors.white70,
                            size: 16,
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),

              // Trip Cards Loop
              ...manifest.deliveryOrders.map((order) {
                final isCompleted =
                    order.status == 'delivered' || order.status == 'completed';

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
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text(
                                "DO ID",
                                style: TextStyle(
                                  color: StitchColors.onSurfaceVariant,
                                  fontSize: 11,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              Text(
                                order.doNumber,
                                style: const TextStyle(
                                  fontFamily: 'JetBrains Mono',
                                  fontSize: 14,
                                  fontWeight: FontWeight.bold,
                                  color: StitchColors.onSurface,
                                ),
                              ),
                            ],
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 8,
                              vertical: 4,
                            ),
                            decoration: BoxDecoration(
                              color: isCompleted
                                  ? StitchColors.secondaryContainer
                                  : StitchColors.primaryFixed,
                              borderRadius: BorderRadius.circular(4.0),
                            ),
                            child: Text(
                              order.status.toUpperCase(),
                              style: TextStyle(
                                color: isCompleted
                                    ? StitchColors.primary
                                    : StitchColors.primary,
                                fontSize: 10,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Icon(
                            Icons.location_on,
                            color: StitchColors.outline,
                            size: 18,
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text(
                                  "BTS Destination",
                                  style: TextStyle(
                                    color: StitchColors.onSurfaceVariant,
                                    fontSize: 11,
                                  ),
                                ),
                                Text(
                                  order.destinationAddress,
                                  style: const TextStyle(
                                    fontSize: 14,
                                    fontWeight: FontWeight.w600,
                                    color: StitchColors.onSurface,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      const Divider(
                        color: StitchColors.outlineVariant,
                        height: 24,
                      ),
                      Row(
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text(
                                  "Est. Distance",
                                  style: TextStyle(
                                    color: StitchColors.onSurfaceVariant,
                                    fontSize: 11,
                                  ),
                                ),
                                Text(
                                  order.slaStatus == 'red'
                                      ? "45.2 KM"
                                      : "12.4 KM",
                                  style: const TextStyle(
                                    fontSize: 13,
                                    fontWeight: FontWeight.bold,
                                    color: StitchColors.onSurface,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text(
                                  "Deadline / SLA",
                                  style: TextStyle(
                                    color: StitchColors.onSurfaceVariant,
                                    fontSize: 11,
                                  ),
                                ),
                                Text(
                                  order.slaStatus.toUpperCase(),
                                  style: TextStyle(
                                    fontSize: 13,
                                    fontWeight: FontWeight.bold,
                                    color: order.slaStatus == 'red'
                                        ? StitchColors.slaRed
                                        : (order.slaStatus == 'yellow'
                                              ? StitchColors.slaYellow
                                              : StitchColors.slaGreen),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                );
              }),

              // 3. Map Preview
              Container(
                height: 160,
                width: double.infinity,
                decoration: BoxDecoration(
                  border: Border.all(color: StitchColors.outlineVariant),
                  borderRadius: BorderRadius.circular(12.0),
                ),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(12.0),
                  child: Stack(
                    fit: StackFit.expand,
                    children: [
                      // Minimalist custom painted map representation
                      CustomPaint(painter: MockMapPainter()),
                      Positioned(
                        bottom: 8,
                        left: 8,
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 10,
                            vertical: 6,
                          ),
                          decoration: BoxDecoration(
                            color: const Color(0xE6FFFFFF),
                            borderRadius: BorderRadius.circular(4.0),
                            border: Border.all(
                              color: StitchColors.outlineVariant,
                            ),
                          ),
                          child: const Row(
                            children: [
                              Icon(
                                Icons.map,
                                size: 14,
                                color: StitchColors.primary,
                              ),
                              SizedBox(width: 6),
                              Text(
                                "View Route Map",
                                style: TextStyle(
                                  fontSize: 11,
                                  color: StitchColors.primary,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

// Custom Painter to draw a clean minimalist route map
class MockMapPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final bgPaint = Paint()..color = const Color(0xFFE3F2FD);
    canvas.drawRect(Rect.fromLTWH(0, 0, size.width, size.height), bgPaint);

    final roadPaint = Paint()
      ..color = Colors.white
      ..style = PaintingStyle.stroke
      ..strokeWidth = 24
      ..strokeCap = StrokeCap.round;

    final roadBorderPaint = Paint()
      ..color = const Color(0xFFB0BEC5)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 26
      ..strokeCap = StrokeCap.round;

    // Draw minimalist roads
    final path = Path();
    path.moveTo(0, size.height * 0.3);
    path.quadraticBezierTo(
      size.width * 0.4,
      size.height * 0.2,
      size.width * 0.5,
      size.height * 0.6,
    );
    path.quadraticBezierTo(
      size.width * 0.6,
      size.height * 0.9,
      size.width,
      size.height * 0.5,
    );

    final path2 = Path();
    path2.moveTo(size.width * 0.3, 0);
    path2.lineTo(size.width * 0.3, size.height);

    canvas.drawPath(path, roadBorderPaint);
    canvas.drawPath(path, roadPaint);
    canvas.drawPath(path2, roadBorderPaint);
    canvas.drawPath(path2, roadPaint);

    // Draw route path
    final routePaint = Paint()
      ..color = const Color(0xFF1E88E5)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 8
      ..strokeCap = StrokeCap.round;

    final routePath = Path();
    routePath.moveTo(size.width * 0.3, size.height * 0.8);
    routePath.lineTo(size.width * 0.3, size.height * 0.45);
    routePath.quadraticBezierTo(
      size.width * 0.4,
      size.height * 0.23,
      size.width * 0.5,
      size.height * 0.6,
    );

    canvas.drawPath(routePath, routePaint);

    // Pins
    final startPin = Paint()..color = Colors.green;
    canvas.drawCircle(Offset(size.width * 0.3, size.height * 0.8), 8, startPin);

    final endPin = Paint()..color = Colors.red;
    canvas.drawCircle(Offset(size.width * 0.5, size.height * 0.6), 8, endPin);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
