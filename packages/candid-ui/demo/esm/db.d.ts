declare type IDBValidKey = string | number | Date | BufferSource | IDBValidKey[];
export declare type DBCreateOptions = {
  dbName?: string;
  storeName?: string;
  version?: number;
};
/**
 * Simple Key Value store
 * Defaults to `'candid-ui'` with an object store of `'ic-keyval'`
 */
export declare class IdbNetworkIds {
  private _db;
  private _storeName;
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
  static create(options?: DBCreateOptions): Promise<IdbNetworkIds>;
  private constructor();
  /**
   * Basic setter
   * @param {IDBValidKey} key string | number | Date | BufferSource | IDBValidKey[]
   * @param value value to set
   * @returns void
   */
  set<T>(key: IDBValidKey, value: T): Promise<IDBValidKey>;
  /**
   * Basic getter
   * Pass in a type T for type safety if you know the type the value will have if it is found
   * @param {IDBValidKey} key string | number | Date | BufferSource | IDBValidKey[]
   * @returns `Promise<T | null>`
   * @example
   * await get<string>('exampleKey') -> 'exampleValue'
   */
  get<T>(key: IDBValidKey): Promise<T | null>;
  /**
   * Remove a key
   * @param key {@link IDBValidKey}
   * @returns void
   */
  remove(key: IDBValidKey): Promise<void>;
  /**
   * Remove all values
   * @returns void
   */
  clear(): Promise<void>;
}
export {};
