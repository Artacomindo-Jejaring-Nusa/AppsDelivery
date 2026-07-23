import 'dart:convert';
import 'package:sqflite/sqflite.dart';
import 'package:path/path.dart';

class DatabaseHelper {
  static const String dbName = 'driver_portal.db';
  static const int dbVersion = 1;

  static Database? _database;

  Future<Database> get database async {
    if (_database != null) return _database!;
    _database = await _initDatabase();
    return _database!;
  }

  Future<Database> _initDatabase() async {
    final dbPath = await getDatabasesPath();
    final path = join(dbPath, dbName);

    return await openDatabase(
      path,
      version: dbVersion,
      onCreate: _onCreate,
    );
  }

  Future<void> _onCreate(Database db, int version) async {
    // 1. Offline Queue Table
    await db.execute('''
      CREATE TABLE offline_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        action TEXT NOT NULL,
        endpoint TEXT NOT NULL,
        method TEXT NOT NULL,
        payload TEXT NOT NULL,
        image_path TEXT,
        created_at TEXT NOT NULL
      )
    ''');

    // 2. Cached Manifest Table
    await db.execute('''
      CREATE TABLE cached_manifest (
        id TEXT PRIMARY KEY,
        manifest_number TEXT NOT NULL,
        status TEXT NOT NULL,
        json_data TEXT NOT NULL,
        cached_at TEXT NOT NULL
      )
    ''');
  }

  // --- Queue Operations ---
  Future<int> queueOfflineTask({
    required String action,
    required String endpoint,
    required String method,
    required Map<String, dynamic> payload,
    String? imagePath,
  }) async {
    final db = await database;
    return await db.insert('offline_queue', {
      'action': action,
      'endpoint': endpoint,
      'method': method,
      'payload': jsonEncode(payload),
      'image_path': imagePath,
      'created_at': DateTime.now().toIso8601String(),
    });
  }

  Future<List<Map<String, dynamic>>> getQueue() async {
    final db = await database;
    return await db.query('offline_queue', orderBy: 'id ASC');
  }

  Future<int> deleteFromQueue(int id) async {
    final db = await database;
    return await db.delete('offline_queue', where: 'id = ?', whereArgs: [id]);
  }

  // --- Cache Operations ---
  Future<void> cacheManifest(String id, String manifestNumber, String status, Map<String, dynamic> jsonData) async {
    final db = await database;
    await db.insert(
      'cached_manifest',
      {
        'id': id,
        'manifest_number': manifestNumber,
        'status': status,
        'json_data': jsonEncode(jsonData),
        'cached_at': DateTime.now().toIso8601String(),
      },
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }

  Future<Map<String, dynamic>?> getCachedManifest() async {
    final db = await database;
    final maps = await db.query('cached_manifest', orderBy: 'cached_at DESC', limit: 1);
    if (maps.isEmpty) return null;
    return maps.first;
  }

  Future<void> clearCache() async {
    final db = await database;
    await db.delete('cached_manifest');
  }
}
