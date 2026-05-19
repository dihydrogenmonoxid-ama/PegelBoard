import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';

const DB_PATH = process.env.DB_PATH ?? path.join(process.cwd(), 'pegelboard.db');

export const db = new DatabaseSync(DB_PATH);

db.exec(`PRAGMA journal_mode = WAL`);
db.exec(`PRAGMA foreign_keys = ON`);

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS layouts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    config TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS gauge_stations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    station_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    river TEXT,
    latitude REAL,
    longitude REAL,
    warning_low REAL,
    warning_medium REAL,
    warning_high REAL,
    warning_extreme REAL
  );

  CREATE TABLE IF NOT EXISTS source_status (
    source_key   TEXT PRIMARY KEY,
    last_ok      TEXT,
    last_attempt TEXT,
    last_error   TEXT
  );

  CREATE TABLE IF NOT EXISTS einsatz_log (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    text       TEXT NOT NULL,
    author     TEXT DEFAULT 'admin',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS einsatzmittel (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT NOT NULL,
    typ        TEXT,
    status     TEXT DEFAULT 'verfügbar',
    notizen    TEXT,
    sort_order INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS aao_icons (
    id   INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    data TEXT NOT NULL
  );
`);

// Migrations: Spalten nachrüsten falls Tabelle aus älterer Version stammt
for (const col of [
  'latitude REAL',
  'longitude REAL',
  'simulate_alarm INTEGER DEFAULT 0',
  'sort_order INTEGER DEFAULT 0',
  'default_history_hours INTEGER DEFAULT 168',
]) {
  try { db.exec(`ALTER TABLE gauge_stations ADD COLUMN ${col}`); } catch { /* bereits vorhanden */ }
}

for (const col of [
  'issi TEXT',
  'icon_data TEXT',
  'klarname TEXT',
]) {
  try { db.exec(`ALTER TABLE einsatzmittel ADD COLUMN ${col}`); } catch { /* bereits vorhanden */ }
}

db.exec(`
  CREATE TABLE IF NOT EXISTS callsign_map (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    icao24 TEXT,
    callsign_pattern TEXT,
    display_name TEXT NOT NULL
  );
`);

// Remove deprecated config keys that cause save errors if still in DB
for (const deprecatedKey of ['openweather_api_key', 'theme']) {
  try { db.prepare('DELETE FROM config WHERE key = ?').run(deprecatedKey); } catch { /* ignore */ }
}

const existing = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
if (!existing) {
  db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)').run('admin', 'CHANGEME');
}
