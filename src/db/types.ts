export type BindValue = string | number | null;

export interface SQLiteRunResult {
  lastInsertRowId: number;
  changes: number;
}

/**
 * Sottoinsieme dell'API expo-sqlite usato dal data layer.
 * Espresso come interfaccia per poter testare le query su SQLite reale.
 */
export interface DB {
  execAsync(source: string): Promise<void>;
  runAsync(source: string, params?: BindValue[]): Promise<SQLiteRunResult>;
  getAllAsync<T>(source: string, params?: BindValue[]): Promise<T[]>;
  getFirstAsync<T>(source: string, params?: BindValue[]): Promise<T | null>;
}

export interface Location {
  id: number;
  name: string;
  parent_id: number | null;
  created_at: number;
}

export interface Item {
  id: number;
  name: string;
  quantity: number;
  notes: string | null;
  photo_uri: string | null;
  location_id: number | null;
  created_at: number;
  updated_at: number;
}

export interface ItemWithLocation extends Item {
  location_name: string | null;
}

export interface LocationWithCounts extends Location {
  item_count: number;
  child_count: number;
}
