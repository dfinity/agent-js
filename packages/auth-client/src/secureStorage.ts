import { openDB, deleteDB, wrap, unwrap } from 'idb';
import { AuthClientStorage, LocalStorage } from './index';

export interface SecureStorageOptions {
  dbName: string;
  dbVersion: number;
  storeName: string;
  index: {
    name: string;
    keyPath: string | string[];
    options?: IDBIndexParameters | undefined;
  };
}

const defaultStorageOptions = {
  dbName: 'AuthClientDb',
  dbVersion: 1,
  storeName: 'ic-credentials',
  index: {
    name: 'ii',
    keyPath: 'delegation',
    options: undefined,
  },
};

export class SecureStorage implements AuthClientStorage {
  //   Browser Support - see https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB
  static _indexedDB: IDBFactory =
    window.indexedDB ||
    (window as any).mozIndexedDB ||
    (window as any).webkitIndexedDB ||
    (window as any).msIndexedDB;
  static _IDBTransaction = window.IDBTransaction ||
    (window as any).webkitIDBTransaction ||
    (window as any).msIDBTransaction || { READ_WRITE: 'readwrite' };
  static _IDBKeyRange =
    window.IDBKeyRange || (window as any).webkitIDBKeyRange || (window as any).msIDBKeyRange;

  private _options: SecureStorageOptions;

  /**
   * create
   */
  public static async create(options?: SecureStorageOptions): Promise<AuthClientStorage> {
    if (!this._indexedDB) {
      console.error(
        new Error(
          "This browser doesn't support a stable version of IndexedDB. Proceeding with LocalStorage instead",
        ),
      );
      return new LocalStorage('ic-');
    } else {
      const effectiveOptions = options ?? defaultStorageOptions;
      const { dbName, storeName, dbVersion } = effectiveOptions;

      // Prepare DB
      await openDB(dbName, dbVersion, {
        upgrade(db) {
          if (!db.objectStoreNames.contains(storeName)) {
            db.createObjectStore(storeName);
          }
        },
      });

      return new this(options ?? defaultStorageOptions);
    }
  }

  protected constructor(_options: SecureStorageOptions) {
    this._options = _options;
  }

  /**
   * get
   */
  public async get(key: string): Promise<string | null> {
    const { dbName, storeName } = this._options;
    const db = await openDB(dbName);
    const store = await db.transaction(storeName, 'readonly').objectStore(storeName);

    return store.get(key);
  }
  /**
   * set
   */
  public async set(key: string, value: string): Promise<void> {
    const { dbName, storeName } = this._options;
    const db = await openDB(dbName);
    const store = await db.transaction(storeName, 'readwrite').objectStore(storeName);

    await store.put(value, key);
  }
  /**
   * remove
   */
  public async remove(key: string): Promise<void> {
    const { dbName, storeName } = this._options;
    const db = await openDB(dbName);
    const store = await db.transaction(storeName, 'readwrite').objectStore(storeName);

    await store.delete(key);
    return;
  }

  private _initializeDb() {
    //   todo
  }
}
