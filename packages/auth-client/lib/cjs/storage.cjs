'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.IdbStorage =
  exports.LocalStorage =
  exports.isBrowser =
  exports.DB_VERSION =
  exports.KEY_VECTOR =
  exports.KEY_STORAGE_DELEGATION =
  exports.KEY_STORAGE_KEY =
    void 0;
const db_js_1 = require('./db.js');
exports.KEY_STORAGE_KEY = 'identity';
exports.KEY_STORAGE_DELEGATION = 'delegation';
exports.KEY_VECTOR = 'iv';
// Increment if any fields are modified
exports.DB_VERSION = 1;
exports.isBrowser = typeof window !== 'undefined';
/**
 * Legacy implementation of AuthClientStorage, for use where IndexedDb is not available
 */
class LocalStorage {
  constructor(prefix = 'ic-', _localStorage) {
    this.prefix = prefix;
    this._localStorage = _localStorage;
  }
  get(key) {
    return Promise.resolve(this._getLocalStorage().getItem(this.prefix + key));
  }
  set(key, value) {
    this._getLocalStorage().setItem(this.prefix + key, value);
    return Promise.resolve();
  }
  remove(key) {
    this._getLocalStorage().removeItem(this.prefix + key);
    return Promise.resolve();
  }
  _getLocalStorage() {
    if (this._localStorage) {
      return this._localStorage;
    }
    const ls =
      typeof window === 'undefined'
        ? typeof global === 'undefined'
          ? typeof self === 'undefined'
            ? undefined
            : self.localStorage
          : global.localStorage
        : window.localStorage;
    if (!ls) {
      throw new Error('Could not find local storage.');
    }
    return ls;
  }
}
exports.LocalStorage = LocalStorage;
/**
 * IdbStorage is an interface for simple storage of string key-value pairs built on {@link IdbKeyVal}
 *
 * It replaces {@link LocalStorage}
 * @see implements {@link AuthClientStorage}
 */
class IdbStorage {
  get _db() {
    return new Promise(resolve => {
      if (this.initializedDb) {
        resolve(this.initializedDb);
        return;
      }
      db_js_1.IdbKeyVal.create({ version: exports.DB_VERSION }).then(db => {
        this.initializedDb = db;
        resolve(db);
      });
    });
  }
  async get(key) {
    const db = await this._db;
    return await db.get(key);
    // return (await db.get<string>(key)) ?? null;
  }
  async set(key, value) {
    const db = await this._db;
    await db.set(key, value);
  }
  async remove(key) {
    const db = await this._db;
    await db.remove(key);
  }
}
exports.IdbStorage = IdbStorage;
//# sourceMappingURL=storage.js.map
