import { DatabaseSync } from 'node:sqlite';

import { migrateDbIfNeeded } from '../src/db/schema.ts';
import type { BindValue, DB, SQLiteRunResult } from '../src/db/types.ts';

/** Adatta node:sqlite all'interfaccia DB usata dal data layer. */
export class NodeSqliteDB implements DB {
  private readonly raw: DatabaseSync;

  constructor(raw: DatabaseSync) {
    this.raw = raw;
  }

  async execAsync(source: string): Promise<void> {
    this.raw.exec(source);
  }

  async runAsync(source: string, params: BindValue[] = []): Promise<SQLiteRunResult> {
    const result = this.raw.prepare(source).run(...params);
    return {
      lastInsertRowId: Number(result.lastInsertRowid),
      changes: Number(result.changes),
    };
  }

  async getAllAsync<T>(source: string, params: BindValue[] = []): Promise<T[]> {
    return this.raw.prepare(source).all(...params) as T[];
  }

  async getFirstAsync<T>(source: string, params: BindValue[] = []): Promise<T | null> {
    return (this.raw.prepare(source).get(...params) ?? null) as T | null;
  }
}

export async function freshDb(): Promise<NodeSqliteDB> {
  const db = new NodeSqliteDB(new DatabaseSync(':memory:'));
  await migrateDbIfNeeded(db);
  return db;
}

export interface SeedTree {
  cucina: number;
  credenza: number;
  cassetto1: number;
  camera: number;
  armadio: number;
}

/** Cucina > Credenza > Cassetto 1, più Camera > Armadio. */
export async function seedTree(db: DB): Promise<SeedTree> {
  const { createLocation } = await import('../src/db/queries.ts');
  const cucina = await createLocation(db, 'Cucina', null);
  const credenza = await createLocation(db, 'Credenza', cucina);
  const cassetto1 = await createLocation(db, 'Cassetto 1', credenza);
  const camera = await createLocation(db, 'Camera di mio figlio', null);
  const armadio = await createLocation(db, 'Armadio', camera);
  return { cucina, credenza, cassetto1, camera, armadio };
}
