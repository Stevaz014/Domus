import type { DB, Item, ItemWithLocation, Location, LocationWithCounts } from './types';

const now = () => Date.now();

// ---------------------------------------------------------------- Luoghi

const SUBTREE_CTE = `
WITH RECURSIVE subtree(id) AS (
  SELECT ? AS id
  UNION ALL
  SELECT l.id FROM locations l JOIN subtree s ON l.parent_id = s.id
)
`;

export async function listChildLocations(
  db: DB,
  parentId: number | null
): Promise<LocationWithCounts[]> {
  const parentClause = parentId === null ? 'l.parent_id IS NULL' : 'l.parent_id = ?';
  const params = parentId === null ? [] : [parentId];

  return db.getAllAsync<LocationWithCounts>(
    `SELECT
       l.id, l.name, l.parent_id, l.created_at,
       (SELECT COUNT(*) FROM items i WHERE i.location_id = l.id) AS item_count,
       (SELECT COUNT(*) FROM locations c WHERE c.parent_id = l.id) AS child_count
     FROM locations l
     WHERE ${parentClause}
     ORDER BY l.name COLLATE NOCASE;`,
    params
  );
}

export async function listAllLocations(db: DB): Promise<Location[]> {
  return db.getAllAsync<Location>(
    'SELECT id, name, parent_id, created_at FROM locations ORDER BY name COLLATE NOCASE;'
  );
}

export async function getLocation(db: DB, id: number): Promise<Location | null> {
  return db.getFirstAsync<Location>(
    'SELECT id, name, parent_id, created_at FROM locations WHERE id = ?;',
    [id]
  );
}

/** Catena degli antenati dal più esterno al più interno, incluso il luogo stesso. */
export async function getLocationPath(db: DB, id: number): Promise<Location[]> {
  return db.getAllAsync<Location>(
    `WITH RECURSIVE ancestors(id, name, parent_id, created_at, depth) AS (
       SELECT id, name, parent_id, created_at, 0 FROM locations WHERE id = ?
       UNION ALL
       SELECT l.id, l.name, l.parent_id, l.created_at, a.depth + 1
       FROM locations l JOIN ancestors a ON l.id = a.parent_id
     )
     SELECT id, name, parent_id, created_at FROM ancestors ORDER BY depth DESC;`,
    [id]
  );
}

export async function createLocation(
  db: DB,
  name: string,
  parentId: number | null
): Promise<number> {
  const result = await db.runAsync(
    'INSERT INTO locations (name, parent_id, created_at) VALUES (?, ?, ?);',
    [name.trim(), parentId, now()]
  );
  return result.lastInsertRowId;
}

export async function renameLocation(db: DB, id: number, name: string): Promise<void> {
  await db.runAsync('UPDATE locations SET name = ? WHERE id = ?;', [name.trim(), id]);
}

/** Un luogo non può essere spostato dentro sé stesso o dentro un proprio discendente. */
export async function isDescendant(
  db: DB,
  ancestorId: number,
  candidateId: number
): Promise<boolean> {
  const row = await db.getFirstAsync<{ found: number }>(
    `${SUBTREE_CTE} SELECT 1 AS found FROM subtree WHERE id = ? LIMIT 1;`,
    [ancestorId, candidateId]
  );
  return row !== null;
}

export async function moveLocation(
  db: DB,
  id: number,
  newParentId: number | null
): Promise<void> {
  if (newParentId !== null) {
    if (newParentId === id) {
      throw new Error('Un luogo non può contenere sé stesso.');
    }
    if (await isDescendant(db, id, newParentId)) {
      throw new Error('Un luogo non può essere spostato dentro un proprio sotto-luogo.');
    }
  }
  await db.runAsync('UPDATE locations SET parent_id = ? WHERE id = ?;', [newParentId, id]);
}

/** Elimina il luogo e tutto il suo sotto-albero. Gli oggetti diventano "senza posto". */
export async function deleteLocation(db: DB, id: number): Promise<void> {
  await db.runAsync(
    `${SUBTREE_CTE}
     UPDATE items SET location_id = NULL, updated_at = ? WHERE location_id IN (SELECT id FROM subtree);`,
    [id, now()]
  );
  await db.runAsync(
    `${SUBTREE_CTE}
     DELETE FROM locations WHERE id IN (SELECT id FROM subtree) AND id != ?;`,
    [id, id]
  );
  await db.runAsync('DELETE FROM locations WHERE id = ?;', [id]);
}

// ---------------------------------------------------------------- Oggetti

const ITEM_SELECT = `
SELECT i.id, i.name, i.quantity, i.notes, i.photo_uri, i.location_id,
       i.created_at, i.updated_at, loc.name AS location_name
FROM items i
LEFT JOIN locations loc ON loc.id = i.location_id
`;

export async function listItemsInLocation(
  db: DB,
  locationId: number | null,
  includeDescendants = false
): Promise<ItemWithLocation[]> {
  if (locationId === null) {
    return db.getAllAsync<ItemWithLocation>(
      `${ITEM_SELECT} WHERE i.location_id IS NULL ORDER BY i.name COLLATE NOCASE;`
    );
  }

  if (!includeDescendants) {
    return db.getAllAsync<ItemWithLocation>(
      `${ITEM_SELECT} WHERE i.location_id = ? ORDER BY i.name COLLATE NOCASE;`,
      [locationId]
    );
  }

  return db.getAllAsync<ItemWithLocation>(
    `${SUBTREE_CTE}
     ${ITEM_SELECT}
     WHERE i.location_id IN (SELECT id FROM subtree)
     ORDER BY i.name COLLATE NOCASE;`,
    [locationId]
  );
}

export async function getItem(db: DB, id: number): Promise<ItemWithLocation | null> {
  return db.getFirstAsync<ItemWithLocation>(`${ITEM_SELECT} WHERE i.id = ?;`, [id]);
}

export interface ItemInput {
  name: string;
  quantity?: number;
  notes?: string | null;
  photoUri?: string | null;
  locationId?: number | null;
}

export async function createItem(db: DB, input: ItemInput): Promise<number> {
  const ts = now();
  const result = await db.runAsync(
    `INSERT INTO items (name, quantity, notes, photo_uri, location_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?);`,
    [
      input.name.trim(),
      input.quantity ?? 1,
      input.notes ?? null,
      input.photoUri ?? null,
      input.locationId ?? null,
      ts,
      ts,
    ]
  );
  return result.lastInsertRowId;
}

export async function updateItem(db: DB, id: number, input: ItemInput): Promise<void> {
  await db.runAsync(
    `UPDATE items
     SET name = ?, quantity = ?, notes = ?, photo_uri = ?, location_id = ?, updated_at = ?
     WHERE id = ?;`,
    [
      input.name.trim(),
      input.quantity ?? 1,
      input.notes ?? null,
      input.photoUri ?? null,
      input.locationId ?? null,
      now(),
      id,
    ]
  );
}

export async function deleteItem(db: DB, id: number): Promise<void> {
  await db.runAsync('DELETE FROM items WHERE id = ?;', [id]);
}

/** Cerca per nome oggetto, note e nome del luogo. */
export async function searchItems(db: DB, query: string): Promise<ItemWithLocation[]> {
  const term = `%${query.trim()}%`;
  return db.getAllAsync<ItemWithLocation>(
    `${ITEM_SELECT}
     WHERE i.name LIKE ?
        OR IFNULL(i.notes, '') LIKE ?
        OR IFNULL(loc.name, '') LIKE ?
     ORDER BY i.name COLLATE NOCASE
     LIMIT 200;`,
    [term, term, term]
  );
}

export async function countItems(db: DB): Promise<number> {
  const row = await db.getFirstAsync<{ c: number }>('SELECT COUNT(*) AS c FROM items;');
  return row?.c ?? 0;
}

export async function listAllItems(db: DB): Promise<ItemWithLocation[]> {
  return db.getAllAsync<ItemWithLocation>(
    `${ITEM_SELECT} ORDER BY i.name COLLATE NOCASE;`
  );
}

export type { Item, ItemWithLocation, Location, LocationWithCounts };
