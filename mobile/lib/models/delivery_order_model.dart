class BtsSiteModel {
  final String id;
  final String siteId;
  final String siteName;
  final String address;
  final String province;
  final String city;
  final double? latitude;
  final double? longitude;

  BtsSiteModel({
    required this.id,
    required this.siteId,
    required this.siteName,
    required this.address,
    required this.province,
    required this.city,
    this.latitude,
    this.longitude,
  });

  factory BtsSiteModel.fromJson(Map<String, dynamic> json) {
    return BtsSiteModel(
      id: json['id'] ?? '',
      siteId: json['site_id'] ?? '',
      siteName: json['site_name'] ?? '',
      address: json['address'] ?? '',
      province: json['province'] ?? '',
      city: json['city'] ?? '',
      latitude: json['latitude'] != null ? double.tryParse(json['latitude'].toString()) : null,
      longitude: json['longitude'] != null ? double.tryParse(json['longitude'].toString()) : null,
    );
  }
}

class DeliveryOrderModel {
  final String id;
  final String doNumber;
  final String type;
  final String description;
  final String status;
  final int slaHours;
  final DateTime? slaDeadline;
  final String slaStatus;
  final String originAddress;
  final String destinationAddress;
  final String notes;
  final BtsSiteModel? btsSite;

  DeliveryOrderModel({
    required this.id,
    required this.doNumber,
    this.type = 'inbound',
    required this.description,
    required this.status,
    required this.slaHours,
    this.slaDeadline,
    required this.slaStatus,
    required this.originAddress,
    required this.destinationAddress,
    required this.notes,
    this.btsSite,
  });

  factory DeliveryOrderModel.fromJson(Map<String, dynamic> json) {
    return DeliveryOrderModel(
      id: json['id'] ?? '',
      doNumber: json['do_number'] ?? '',
      type: json['type'] ?? 'inbound',
      description: json['description'] ?? '',
      status: json['status'] ?? '',
      slaHours: json['sla_hours'] ?? 72,
      slaDeadline: json['sla_deadline'] != null ? DateTime.tryParse(json['sla_deadline']) : null,
      slaStatus: json['sla_status'] ?? 'green',
      originAddress: json['origin_address'] ?? '',
      destinationAddress: json['destination_address'] ?? '',
      notes: json['notes'] ?? '',
      btsSite: json['bts_site'] != null ? BtsSiteModel.fromJson(json['bts_site']) : null,
    );
  }
}
