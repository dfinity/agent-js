import { openDB, IDBPDatabase } from 'idb';

type Database = IDBPDatabase<unknown>;
const AUTH_DB_NAME = 'auth-client-db';
const OBJECT_STORE_NAME = 'ic-keyval';

const openDbStore = async (dbName = AUTH_DB_NAME, storeName = OBJECT_STORE_NAME, version: number) =>
  await openDB(dbName, version, {
    upgrade: database => {
      database.objectStoreNames;
      if (database.objectStoreNames.contains(storeName)) {
        database.clear(storeName);
      }
      database.createObjectStore(storeName);
    },
  });

/**
 *
 * @param db database
 * @param key string
 * @returns
 */
async function getValue<T>(
  db: Database,
  storeName: string,
  key: IDBValidKey,
): Promise<T | undefined> {
  return await db.get(storeName, key);
}

/**
 *
 * @param db database
 * @param value any value to set
 * @param key string asdf
 */
async function setValue<T>(
  db: Database,
  storeName: string,
  key: IDBValidKey,
  value: T,
): Promise<IDBValidKey> {
  return await db.put(storeName, value, key);
}

/**
 *
 * @param db database
 * @param value any value to remove
 * @param key string asdf
 */
async function removeValue(db: Database, storeName: string, key: IDBValidKey): Promise<void> {
  return await db.delete(storeName, key);
}

export type DBCreateOptions = {
  dbName?: string;
  storeName?: string;
  version?: number;
};
export class IdbKeyVal {
  public static async create(options?: DBCreateOptions) {
    const { dbName = AUTH_DB_NAME, storeName = OBJECT_STORE_NAME, version = 1 } = options ?? {};
    const db = await openDbStore(dbName, storeName, version);
    return new IdbKeyVal(db, storeName);
  }

  private constructor(private _db: Database, private _storeName: string) {}

  public async set<T>(key: IDBValidKey, value: T) {
    return await setValue<T>(this._db, this._storeName, key, value);
  }
  public async get<T>(key: IDBValidKey): Promise<T | null> {
    return (await getValue<T>(this._db, this._storeName, key)) ?? null;
  }
  public async remove(key: IDBValidKey) {
    return await removeValue(this._db, this._storeName, key);
  }
}
