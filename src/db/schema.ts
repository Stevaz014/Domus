import type { DB } from './types';

export const DATABASE_NAME = 'casa-inventario.db';
export const DATABASE_VERSION = 1;

const SCHEMA_V1 = `
CREATE TABLE IF NOT EXISTS locations (
  id INTEGER PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  parent_id INTEGER REFERENCES locations(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS items (
  id INTEGER PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  notes TEXT,
  photo_uri TEXT,
  location_id INTEGER REFERENCES locations(id) ON DELETE SET NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_locations_parent ON locations(parent_id);
CREATE INDEX IF NOT EXISTS idx_items_location ON items(location_id);
CREATE INDEX IF NOT EXISTS idx_items_name ON items(name);
`;

export async function migrateDbIfNeeded(db: DB): Promise<void> {
  try {
    await db.execAsync('PRAGMA journal_mode = WAL;');
  } catch {
    // WAL non è disponibile ovunque (es. build web/wasm): non è bloccante.
  }

  await db.execAsync('PRAGMA foreign_keys = ON;');

  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version;');
  const currentVersion = row?.user_version ?? 0;

  if (currentVersion >= DATABASE_VERSION) {
    return;
  }

  if (currentVersion < 1) {
    await db.execAsync(SCHEMA_V1);
  }

  await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION};`);
}
