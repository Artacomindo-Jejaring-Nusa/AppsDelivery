import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/theme/colors.dart';
import '../../providers/sync_provider.dart';

class SyncTab extends StatefulWidget {
  const SyncTab({super.key});

  @override
  State<SyncTab> createState() => _SyncTabState();
}

class _SyncTabState extends State<SyncTab> with SingleTickerProviderStateMixin {
  late AnimationController _animationController;

  @override
  void initState() {
    super.initState();
    _animationController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 2),
    );
  }

  @override
  void dispose() {
    _animationController.dispose();
    super.dispose();
  }

  Future<void> _handleSync(SyncProvider syncProv) async {
    _animationController.repeat();
    await syncProv.syncNow();
    _animationController.stop();

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("Sync execution completed successfully.")),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final syncProv = Provider.of<SyncProvider>(context);

    // If sync provider is internally running sync, keep spinner spinning
    if (syncProv.isSyncing && !_animationController.isAnimating) {
      _animationController.repeat();
    } else if (!syncProv.isSyncing && _animationController.isAnimating) {
      _animationController.stop();
    }

    return Padding(
      padding: const EdgeInsets.all(24.0),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          // 1. Connection Mode Details Card
          Container(
            padding: const EdgeInsets.all(16.0),
            decoration: BoxDecoration(
              color: StitchColors.surfaceContainerLowest,
              border: Border.all(color: StitchColors.outlineVariant),
              borderRadius: BorderRadius.circular(12.0),
            ),
            child: Column(
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text("Network Status", style: TextStyle(fontWeight: FontWeight.bold)),
                    Row(
                      children: [
                        Container(
                          width: 8,
                          height: 8,
                          decoration: BoxDecoration(
                            color: syncProv.isOnline ? Colors.green : Colors.orange,
                            shape: BoxShape.circle,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          syncProv.isOnline ? "ONLINE MODE" : "OFFLINE MODE",
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            color: syncProv.isOnline ? Colors.green[800] : Colors.orange[800],
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
                const Divider(color: StitchColors.outlineVariant, height: 24),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text("Offline Tasks Queued", style: TextStyle(color: StitchColors.secondary)),
                    Text(
                      "${syncProv.pendingCount} Tasks",
                      style: const TextStyle(fontWeight: FontWeight.bold, color: StitchColors.primary),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 48),

          // 2. Central Spinning Sync Button
          GestureDetector(
            onTap: syncProv.isSyncing ? null : () => _handleSync(syncProv),
            child: MouseRegion(
              cursor: SystemMouseCursors.click,
              child: Stack(
                alignment: Alignment.center,
                children: [
                  // Outer glowing rings
                  Container(
                    width: 140,
                    height: 140,
                    decoration: const BoxDecoration(
                      color: Color(0x0D00236F),
                      shape: BoxShape.circle,
                    ),
                  ),
                  Container(
                    width: 120,
                    height: 120,
                    decoration: const BoxDecoration(
                      color: Color(0x1A00236F),
                      shape: BoxShape.circle,
                    ),
                  ),
                  // Inner spinning button
                  RotationTransition(
                    turns: _animationController,
                    child: Container(
                      width: 100,
                      height: 100,
                      decoration: const BoxDecoration(
                        color: StitchColors.primary,
                        shape: BoxShape.circle,
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black26,
                            blurRadius: 10,
                            offset: Offset(0, 5),
                          )
                        ],
                      ),
                      child: const Icon(
                        Icons.sync,
                        color: Colors.white,
                        size: 48,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 24),

          Text(
            syncProv.isSyncing ? "SYNCING DATA..." : "TAP TO SYNC NOW",
            style: const TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: StitchColors.primary,
              letterSpacing: 1.2,
            ),
          ),
          const SizedBox(height: 8),
          const Text(
            "Uploads pending offline signatures, photos, and delivery statuses to the server.",
            style: TextStyle(color: StitchColors.secondary, fontSize: 13),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }
}
