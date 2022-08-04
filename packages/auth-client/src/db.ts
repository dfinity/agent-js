import { openDB, IDBPDatabase } from 'idb';

export type Database = Promise<IDBPDatabase<unknown>>;
export const AUTH_DB_NAME = 'auth-client-db';
export const OBJECT_STORE_NAME = 'keyval-store';

export const openDbStore = async () =>
  await openDB(AUTH_DB_NAME, 1, {
    upgrade: database => {
      database.objectStoreNames;
      if (database.objectStoreNames.contains(OBJECT_STORE_NAME)) {
        database.clear(OBJECT_STORE_NAME);
      }
      database.createObjectStore(OBJECT_STORE_NAME);
    },
  });

/**
 *
 * @param db database
 * @param key string
 * @returns
 */
export async function getValue<T>(db: Database, key: string): Promise<T | undefined> {
  return (await db).get(OBJECT_STORE_NAME, key);
}

/**
 *
 * @param db database
 * @param value any value to set
 * @param key string asdf
 */
export async function setValue<T>(db: Database, value: T, key: string): Promise<void> {
  (await db).put(OBJECT_STORE_NAME, value, key);
}

/**
 *
 * @param db database
 * @param value any value to remove
 * @param key string asdf
 */
export async function removeValue(db: Database, key: string): Promise<void> {
  (await db).delete(OBJECT_STORE_NAME, key);
}

export const db = openDbStore();
