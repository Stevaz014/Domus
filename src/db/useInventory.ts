import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';

import * as q from './queries';
import type { DB, ItemWithLocation, Location, LocationWithCounts } from './types';

export function useDb(): DB {
  return useSQLiteContext() as unknown as DB;
}

/** Riesegue il loader ogni volta che la schermata torna in primo piano. */
export function useLiveData<T>(
  loader: (db: DB) => Promise<T>,
  deps: readonly unknown[] = []
): { data: T | null; loading: boolean; reload: () => void } {
  const db = useDb();
  const depKey = JSON.stringify(deps);
  const loaderRef = useRef(loader);
  useEffect(() => {
    loaderRef.current = loader;
  }, [loader]);
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [nonce, setNonce] = useState(0);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setLoading(true);
      loaderRef.current(db)
        .then((result) => {
          if (!cancelled) setData(result);
        })
        .catch((error) => {
          console.error('Errore nel caricamento dei dati', error);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
      return () => {
        cancelled = true;
      };
      // loader is kept in a ref so changing it does not restart a focused screen.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [db, nonce, depKey])
  );

  return { data, loading, reload };
}

export const useChildLocations = (parentId: number | null) =>
  useLiveData<LocationWithCounts[]>((db) => q.listChildLocations(db, parentId), [parentId]);

export const useLocationPath = (id: number) =>
  useLiveData<Location[]>((db) => q.getLocationPath(db, id), [id]);

export const useItemsInLocation = (locationId: number | null, deep: boolean) =>
  useLiveData<ItemWithLocation[]>(
    (db) => q.listItemsInLocation(db, locationId, deep),
    [locationId, deep]
  );

export const useItem = (id: number) =>
  useLiveData<ItemWithLocation | null>((db) => q.getItem(db, id), [id]);
