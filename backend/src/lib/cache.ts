import { db } from '../db/database.js';

export function recordFetchSuccess(source: string) {
  const now = new Date().toISOString();
  db.prepare(
    'INSERT OR REPLACE INTO source_status (source_key, last_ok, last_attempt, last_error) VALUES (?,?,?,NULL)'
  ).run(source, now, now);
}

export function recordFetchError(source: string, err: unknown) {
  db.prepare(
    'INSERT OR REPLACE INTO source_status (source_key, last_attempt, last_error) VALUES (?,?,?)'
  ).run(source, new Date().toISOString(), String(err));
}
