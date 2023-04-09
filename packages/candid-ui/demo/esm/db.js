import { openDB } from 'idb';
const AUTH_DB_NAME = 'candid-ui-db';
const OBJECT_STORE_NAME = 'ic-keyval';
const _openDbStore = async (dbName = AUTH_DB_NAME, storeName = OBJECT_STORE_NAME, version) => {
  // Clear legacy stored delegations
  return await openDB(dbName, version, {
    upgrade: database => {
      database.objectStoreNames;
      if (database.objectStoreNames.contains(storeName)) {
        database.clear(storeName);
      }
      database.createObjectStore(storeName);
    },
  });
};
async function _getValue(db, storeName, key) {
  return await db.get(storeName, key);
}
async function _setValue(db, storeName, key, value) {
  return await db.put(storeName, value, key);
}
async function _removeValue(db, storeName, key) {
  return await db.delete(storeName, key);
}
/**
 * Simple Key Value store
 * Defaults to `'candid-ui'` with an object store of `'ic-keyval'`
 */
export class IdbNetworkIds {
  /**
   *
   * @param {DBCreateOptions} options {@link DbCreateOptions}
   * @param {DBCreateOptions['dbName']} options.dbName name for the indexeddb database
   * @default 'candid-ui'
   * @param {DBCreateOptions['storeName']} options.storeName name for the indexeddb Data Store
   * @default 'ic-keyval'
   * @param {DBCreateOptions['version']} options.version version of the database. Increment to safely upgrade
   * @constructs an {@link IdbKeyVal}
   */
  static async create(options) {
    const { dbName = AUTH_DB_NAME, storeName = OBJECT_STORE_NAME, version = 1 } = options ?? {};
    const db = await _openDbStore(dbName, storeName, version);
    return new IdbNetworkIds(db, storeName);
  }
  // Do not use - instead prefer create
  constructor(_db, _storeName) {
    this._db = _db;
    this._storeName = _storeName;
  }
  /**
   * Basic setter
   * @param {IDBValidKey} key string | number | Date | BufferSource | IDBValidKey[]
   * @param value value to set
   * @returns void
   */
  async set(key, value) {
    return await _setValue(this._db, this._storeName, key, value);
  }
  /**
   * Basic getter
   * Pass in a type T for type safety if you know the type the value will have if it is found
   * @param {IDBValidKey} key string | number | Date | BufferSource | IDBValidKey[]
   * @returns `Promise<T | null>`
   * @example
   * await get<string>('exampleKey') -> 'exampleValue'
   */
  async get(key) {
    return (await _getValue(this._db, this._storeName, key)) ?? null;
  }
  /**
   * Remove a key
   * @param key {@link IDBValidKey}
   * @returns void
   */
  async remove(key) {
    return await _removeValue(this._db, this._storeName, key);
  }
  /**
   * Remove all values
   * @returns void
   */
  async clear() {
    return await this._db.clear(this._storeName);
  }
}
