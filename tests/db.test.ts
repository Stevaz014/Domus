import test from 'node:test';
import assert from 'node:assert/strict';

import { migrateDbIfNeeded, DATABASE_VERSION } from '../src/db/schema.ts';
import {
  createItem,
  createLocation,
  deleteItem,
  deleteLocation,
  getItem,
  getLocationPath,
  isDescendant,
  listChildLocations,
  listItemsInLocation,
  moveLocation,
  searchItems,
  updateItem,
} from '../src/db/queries.ts';
import { freshDb, seedTree } from './helpers.ts';

test('migrate crea lo schema e imposta user_version', async () => {
  const db = await freshDb();
  const version = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version;');
  assert.equal(version?.user_version, DATABASE_VERSION);

  const tables = await db.getAllAsync<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;"
  );
  const names = tables.map((t) => t.name);
  assert.ok(names.includes('locations'));
  assert.ok(names.includes('items'));
});

test('migrate è idempotente', async () => {
  const db = await freshDb();
  await migrateDbIfNeeded(db);
  const version = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version;');
  assert.equal(version?.user_version, DATABASE_VERSION);
});

test('elenco luoghi radice con conteggi', async () => {
  const db = await freshDb();
  const { cucina, credenza, cassetto1, camera } = await seedTree(db);
  await createItem(db, { name: 'Forbici', locationId: cassetto1 });
  await createItem(db, { name: 'Piatti', locationId: credenza });

  const roots = await listChildLocations(db, null);
  assert.deepEqual(
    roots.map((l) => l.name),
    ['Camera di mio figlio', 'Cucina']
  );

  const cucinaRow = roots.find((l) => l.id === cucina);
  assert.ok(cucinaRow);
  assert.equal(cucinaRow.child_count, 1);
  assert.equal(cucinaRow.item_count, 0);

  const cucinaChildren = await listChildLocations(db, cucina);
  assert.deepEqual(
    cucinaChildren.map((l) => l.name),
    ['Credenza']
  );
  assert.equal(cucinaChildren[0]?.item_count, 1);

  assert.ok(roots.some((l) => l.id === camera));
});

test("getLocationPath restituisce la catena dall'esterno all'interno", async () => {
  const db = await freshDb();
  const { cassetto1 } = await seedTree(db);

  const path = await getLocationPath(db, cassetto1);
  assert.deepEqual(
    path.map((l) => l.name),
    ['Cucina', 'Credenza', 'Cassetto 1']
  );
});

test('oggetti: diretti vs sotto-albero', async () => {
  const db = await freshDb();
  const { cucina, credenza, cassetto1 } = await seedTree(db);
  await createItem(db, { name: 'Forbici', locationId: cassetto1 });
  await createItem(db, { name: 'Tovaglia', locationId: credenza });
  await createItem(db, { name: 'Senza posto', locationId: null });

  const direct = await listItemsInLocation(db, credenza, false);
  assert.deepEqual(
    direct.map((i) => i.name),
    ['Tovaglia']
  );

  const deep = await listItemsInLocation(db, cucina, true);
  assert.deepEqual(
    deep.map((i) => i.name),
    ['Forbici', 'Tovaglia']
  );

  const orphans = await listItemsInLocation(db, null);
  assert.deepEqual(
    orphans.map((i) => i.name),
    ['Senza posto']
  );
});

test('ricerca su nome, note e nome del luogo', async () => {
  const db = await freshDb();
  const { cassetto1, armadio } = await seedTree(db);
  await createItem(db, { name: 'Forbici', notes: 'da cucito', locationId: cassetto1 });
  await createItem(db, { name: 'Lenzuola', locationId: armadio });

  assert.deepEqual(
    (await searchItems(db, 'forb')).map((i) => i.name),
    ['Forbici']
  );
  assert.deepEqual(
    (await searchItems(db, 'cucito')).map((i) => i.name),
    ['Forbici']
  );
  assert.deepEqual(
    (await searchItems(db, 'armadio')).map((i) => i.name),
    ['Lenzuola']
  );
  assert.equal((await searchItems(db, 'inesistente')).length, 0);
});

test('searchItems restituisce il nome del luogo', async () => {
  const db = await freshDb();
  const { cassetto1 } = await seedTree(db);
  const id = await createItem(db, { name: 'Forbici', locationId: cassetto1 });
  const found = await searchItems(db, 'forbici');
  assert.equal(found[0]?.location_name, 'Cassetto 1');
  assert.equal(found[0]?.id, id);
});

test('updateItem modifica i campi', async () => {
  const db = await freshDb();
  const { cassetto1, armadio } = await seedTree(db);
  const id = await createItem(db, { name: 'Forbici', locationId: cassetto1 });

  await updateItem(db, id, {
    name: 'Forbici da cucito',
    quantity: 3,
    notes: 'lama arrugginita',
    locationId: armadio,
  });

  const item = await getItem(db, id);
  assert.ok(item);
  assert.equal(item.name, 'Forbici da cucito');
  assert.equal(item.quantity, 3);
  assert.equal(item.notes, 'lama arrugginita');
  assert.equal(item.location_id, armadio);
});

test("deleteItem rimuove l'oggetto", async () => {
  const db = await freshDb();
  const id = await createItem(db, { name: 'Forbici', locationId: null });
  await deleteItem(db, id);
  assert.equal(await getItem(db, id), null);
});

test('moveLocation rifiuta di spostare un luogo dentro un proprio discendente', async () => {
  const db = await freshDb();
  const { cucina, credenza, cassetto1 } = await seedTree(db);

  assert.equal(await isDescendant(db, cucina, cassetto1), true);
  assert.equal(await isDescendant(db, cassetto1, cucina), false);

  await assert.rejects(() => moveLocation(db, cucina, cassetto1), /sotto-luogo/);
  await assert.rejects(() => moveLocation(db, credenza, credenza), /sé stesso/);

  await moveLocation(db, cassetto1, null);
  const roots = await listChildLocations(db, null);
  assert.ok(roots.some((l) => l.name === 'Cassetto 1'));
});

test('deleteLocation elimina il sotto-albero e orfana gli oggetti', async () => {
  const db = await freshDb();
  const { cucina, credenza, cassetto1, camera } = await seedTree(db);
  const forbici = await createItem(db, { name: 'Forbici', locationId: cassetto1 });

  await deleteLocation(db, cucina);

  const roots = await listChildLocations(db, null);
  assert.deepEqual(
    roots.map((l) => l.name),
    ['Camera di mio figlio']
  );
  assert.equal(await db.getFirstAsync('SELECT * FROM locations WHERE id = ?;', [credenza]), null);
  assert.equal(await db.getFirstAsync('SELECT * FROM locations WHERE id = ?;', [cassetto1]), null);
  assert.ok(roots.some((l) => l.id === camera));

  const item = await getItem(db, forbici);
  assert.ok(item);
  assert.equal(item.location_id, null);
});

test('deleteLocation su un ramo interno non tocca i fratelli', async () => {
  const db = await freshDb();
  const { cucina, credenza, cassetto1 } = await seedTree(db);
  const ripiano = await createLocation(db, 'Ripiano', cucina);

  await deleteLocation(db, credenza);

  const children = await listChildLocations(db, cucina);
  assert.deepEqual(
    children.map((l) => l.name),
    ['Ripiano']
  );
  assert.equal(await db.getFirstAsync('SELECT * FROM locations WHERE id = ?;', [cassetto1]), null);
  assert.ok(ripiano > 0);
});
