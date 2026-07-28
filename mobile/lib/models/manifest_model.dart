import 'delivery_order_model.dart';

class ManifestModel {
  final String id;
  final String manifestNumber;
  final String driverId;
  final String driverName;
  final String vehicleType;
  final String vehiclePlate;
  final String status;
  final DateTime? dispatchDate;
  final DateTime? completedDate;
  final String notes;
  final List<DeliveryOrderModel> deliveryOrders;

  ManifestModel({
    required this.id,
    required this.manifestNumber,
    required this.driverId,
    this.driverName = '',
    this.vehicleType = '',
    this.vehiclePlate = '',
    required this.status,
    this.dispatchDate,
    this.completedDate,
    required this.notes,
    required this.deliveryOrders,
  });

  factory ManifestModel.fromJson(Map<String, dynamic> json) {
    List<DeliveryOrderModel> orders = [];
    if (json['items'] != null && json['items'] is List) {
      for (final item in json['items']) {
        if (item is Map<String, dynamic> && item['delivery_order'] != null) {
          orders.add(DeliveryOrderModel.fromJson(item['delivery_order']));
        }
      }
    } else if (json['delivery_orders'] != null && json['delivery_orders'] is List) {
      for (final i in json['delivery_orders']) {
        if (i is Map<String, dynamic>) {
          orders.add(DeliveryOrderModel.fromJson(i));
        }
      }
    }

    final driverObj = json['driver'] as Map<String, dynamic>?;

    return ManifestModel(
      id: json['id'] ?? '',
      manifestNumber: json['manifest_number'] ?? '',
      driverId: json['driver_id'] ?? '',
      driverName: json['driver_name'] ?? driverObj?['full_name'] ?? '',
      vehicleType: json['vehicle_type'] ?? driverObj?['vehicle_type'] ?? '',
      vehiclePlate: json['vehicle_plate'] ?? driverObj?['vehicle_plate'] ?? '',
      status: json['status'] ?? '',
      dispatchDate: json['dispatch_date'] != null ? DateTime.tryParse(json['dispatch_date']) : null,
      completedDate: json['completed_date'] != null ? DateTime.tryParse(json['completed_date']) : null,
      notes: json['notes'] ?? '',
      deliveryOrders: orders,
    );
  }
}
