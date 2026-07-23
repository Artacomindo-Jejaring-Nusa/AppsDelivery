import 'delivery_order_model.dart';

class ManifestModel {
  final String id;
  final String manifestNumber;
  final String driverId;
  final String status;
  final DateTime? dispatchDate;
  final DateTime? completedDate;
  final String notes;
  final List<DeliveryOrderModel> deliveryOrders;

  ManifestModel({
    required this.id,
    required this.manifestNumber,
    required this.driverId,
    required this.status,
    this.dispatchDate,
    this.completedDate,
    required this.notes,
    required this.deliveryOrders,
  });

  factory ManifestModel.fromJson(Map<String, dynamic> json) {
    var list = json['delivery_orders'] as List?;
    List<DeliveryOrderModel> orders = list != null
        ? list.map((i) => DeliveryOrderModel.fromJson(i)).toList()
        : [];

    return ManifestModel(
      id: json['id'] ?? '',
      manifestNumber: json['manifest_number'] ?? '',
      driverId: json['driver_id'] ?? '',
      status: json['status'] ?? '',
      dispatchDate: json['dispatch_date'] != null ? DateTime.tryParse(json['dispatch_date']) : null,
      completedDate: json['completed_date'] != null ? DateTime.tryParse(json['completed_date']) : null,
      notes: json['notes'] ?? '',
      deliveryOrders: orders,
    );
  }
}
