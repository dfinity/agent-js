'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.IdbKeyVal = void 0;
const idb_1 = require('idb');
const storage_js_1 = require('./storage.js');
const AUTH_DB_NAME = 'auth-client-db';
const OBJECT_STORE_NAME = 'ic-keyval';
const _openDbStore = async (dbName = AUTH_DB_NAME, storeName = OBJECT_STORE_NAME, version) => {
  // Clear legacy stored delegations
  if (
    storage_js_1.isBrowser &&
    (localStorage === null || localStorage === void 0
      ? void 0
      : localStorage.getItem(storage_js_1.KEY_STORAGE_DELEGATION))
  ) {
    localStorage.removeItem(storage_js_1.KEY_STORAGE_DELEGATION);
    localStorage.removeItem(storage_js_1.KEY_STORAGE_KEY);
  }
  return await (0, idb_1.openDB)(dbName, version, {
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
 * Defaults to `'auth-client-db'` with an object store of `'ic-keyval'`
 */
class IdbKeyVal {
  // Do not use - instead prefer create
  constructor(_db, _storeName) {
    this._db = _db;
    this._storeName = _storeName;
  }
  /**
   *
   * @param {DBCreateOptions} options {@link DbCreateOptions}
   * @param {DBCreateOptions['dbName']} options.dbName name for the indexeddb database
   * @default 'auth-client-db'
   * @param {DBCreateOptions['storeName']} options.storeName name for the indexeddb Data Store
   * @default 'ic-keyval'
   * @param {DBCreateOptions['version']} options.version version of the database. Increment to safely upgrade
   * @constructs an {@link IdbKeyVal}
   */
  static async create(options) {
    const {
      dbName = AUTH_DB_NAME,
      storeName = OBJECT_STORE_NAME,
      version = 1,
    } = options !== null && options !== void 0 ? options : {};
    const db = await _openDbStore(dbName, storeName, version);
    return new IdbKeyVal(db, storeName);
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
    var _a;
    return (_a = await _getValue(this._db, this._storeName, key)) !== null && _a !== void 0
      ? _a
      : null;
  }
  /**
   * Remove a key
   * @param key {@link IDBValidKey}
   * @returns void
   */
  async remove(key) {
    return await _removeValue(this._db, this._storeName, key);
  }
}
exports.IdbKeyVal = IdbKeyVal;
//# sourceMappingURL=db.js.map
