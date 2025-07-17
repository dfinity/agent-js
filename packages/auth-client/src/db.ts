import { openDB, type IDBPDatabase } from 'idb';
import { DB_VERSION, isBrowser, KEY_STORAGE_DELEGATION, KEY_STORAGE_KEY } from './storage.ts';

type Database = IDBPDatabase<unknown>;
type IDBValidKey = string | number | Date | BufferSource | IDBValidKey[];
const AUTH_DB_NAME = 'auth-client-db';
const OBJECT_STORE_NAME = 'ic-keyval';

const _openDbStore = async (
  dbName = AUTH_DB_NAME,
  storeName = OBJECT_STORE_NAME,
  version: number,
) => {
  // Clear legacy stored delegations
  if (isBrowser && localStorage?.getItem(KEY_STORAGE_DELEGATION)) {
    localStorage.removeItem(KEY_STORAGE_DELEGATION);
    localStorage.removeItem(KEY_STORAGE_KEY);
  }
  return await openDB(dbName, version, {
    upgrade: database => {
      if (database.objectStoreNames.contains(storeName)) {
        database.clear(storeName);
      }
      database.createObjectStore(storeName);
    },
  });
};

async function _getValue<T>(
  db: Database,
  storeName: string,
  key: IDBValidKey,
): Promise<T | undefined> {
  return await db.get(storeName, key);
}

async function _setValue<T>(
  db: Database,
  storeName: string,
  key: IDBValidKey,
  value: T,
): Promise<IDBValidKey> {
  return await db.put(storeName, value, key);
}

async function _removeValue(db: Database, storeName: string, key: IDBValidKey): Promise<void> {
  return await db.delete(storeName, key);
}

export type DBCreateOptions = {
  dbName?: string;
  storeName?: string;
  version?: number;
};

/**
 * Simple Key Value store
 * Defaults to `'auth-client-db'` with an object store of `'ic-keyval'`
 */
export class IdbKeyVal {
  /**
   * @param {DBCreateOptions} options - DBCreateOptions
   * @param {DBCreateOptions['dbName']} options.dbName name for the indexeddb database
   * @default
   * @param {DBCreateOptions['storeName']} options.storeName name for the indexeddb Data Store
   * @default
   * @param {DBCreateOptions['version']} options.version version of the database. Increment to safely upgrade
   */
  public static async create(options?: DBCreateOptions): Promise<IdbKeyVal> {
    const {
      dbName = AUTH_DB_NAME,
      storeName = OBJECT_STORE_NAME,
      version = DB_VERSION,
    } = options ?? {};
    const db = await _openDbStore(dbName, storeName, version);
    return new IdbKeyVal(db, storeName);
  }

  // Do not use - instead prefer create
  private constructor(
    private _db: Database,
    private _storeName: string,
  ) {}

  /**
   * Basic setter
   * @param {IDBValidKey} key string | number | Date | BufferSource | IDBValidKey[]
   * @param value value to set
   * @returns void
   */
  public async set<T>(key: IDBValidKey, value: T) {
    return await _setValue<T>(this._db, this._storeName, key, value);
  }
  /**
   * Basic getter
   * Pass in a type T for type safety if you know the type the value will have if it is found
   * @param {IDBValidKey} key string | number | Date | BufferSource | IDBValidKey[]
   * @returns `Promise<T | null>`
   * @example
   * await get<string>('exampleKey') -> 'exampleValue'
   */
  public async get<T>(key: IDBValidKey): Promise<T | null> {
    return (await _getValue<T>(this._db, this._storeName, key)) ?? null;
  }

  /**
   * Remove a key
   * @param key {@link IDBValidKey}
   * @returns void
   */
  public async remove(key: IDBValidKey) {
    return await _removeValue(this._db, this._storeName, key);
  }
}
