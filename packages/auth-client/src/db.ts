import { openDB, IDBPDatabase } from 'idb';

export type Database = Promise<IDBPDatabase<unknown>>;

export const openDbStore = async () =>
  await openDB('auth-client-db', 1, {
    upgrade: database => {
      if (database.objectStoreNames.contains('ic-idp')) {
        database.clear('ic-idp');
      }
      database.createObjectStore('ic-idp');
    },
  });

/**
 *
 * @param db database
 * @param key string
 * @returns
 */
export async function getValue<T>(db: Database, key: string): Promise<T | undefined> {
  return (await db).get('ic-idp', key);
}

/**
 *
 * @param db database
 * @param value any value to set
 * @param key string asdf
 */
export async function setValue<T>(db: Database, value: T, key: string): Promise<void> {
  (await db).put('ic-idp', value, key);
}

/**
 *
 * @param db database
 * @param value any value to remove
 * @param key string asdf
 */
export async function removeValue(db: Database, key: string): Promise<void> {
  (await db).delete('ic-idp', key);
}

export const db = openDbStore();
