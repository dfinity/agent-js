import { db, getValue, removeValue, setValue } from './db';
const set = async <T>(key: string, value: T) => await setValue<T>(db, value, key);
const get = async <T>(key: string): Promise<T | undefined> => await getValue<T>(db, key);
const remove = async (key: string) => await removeValue(db, key);

export const KEY_STORAGE_KEY = 'identity';
export const KEY_STORAGE_DELEGATION = 'delegation';
export const KEY_ENCRYPTION = 'encrypt-key';
export const KEY_VECTOR = 'iv';

/**
 * Interface for persisting user authentication data
 */
export interface AuthClientStorage {
  get(key: string): Promise<string | null>;

  set(key: string, value: string): Promise<void>;

  remove(key: string): Promise<void>;
}

export class LocalStorage implements AuthClientStorage {
  constructor(public readonly prefix = 'ic-', private readonly _localStorage?: Storage) {}

  public get(key: string): Promise<string | null> {
    return Promise.resolve(this._getLocalStorage().getItem(this.prefix + key));
  }

  public set(key: string, value: string): Promise<void> {
    this._getLocalStorage().setItem(this.prefix + key, value);
    return Promise.resolve();
  }

  public remove(key: string): Promise<void> {
    this._getLocalStorage().removeItem(this.prefix + key);
    return Promise.resolve();
  }

  private _getLocalStorage() {
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

export class IdbStorage implements AuthClientStorage {
  public async get(key: string): Promise<string | null> {
    return (await get(key)) ?? null;
  }

  public async set(key: string, value: string): Promise<void> {
    await set(key, value);
  }

  public async remove(key: string): Promise<void> {
    await remove(key);
  }
}
export class EncryptedIdbStorage implements AuthClientStorage {
  storedKey: CryptoKey | undefined;
  private get encryptKey() {
    return new Promise<CryptoKey>(resolve => {
      if (this.storedKey) resolve(this.storedKey);
      get<CryptoKey | undefined>(KEY_ENCRYPTION).then(async storedKey => {
        const key =
          storedKey ??
          (await crypto.subtle.generateKey(
            {
              name: 'AES-CBC',
              length: 256,
            },
            false,
            ['encrypt', 'decrypt'],
          ));
        this.storedKey = storedKey;

        await set(KEY_ENCRYPTION, key);
        resolve(key);
      });
    });
  }
  private get iv() {
    return new Promise<Uint8Array>(resolve => {
      get<Uint8Array | undefined>(KEY_VECTOR).then(async storedIv => {
        const iv = storedIv ?? (await crypto.getRandomValues(new Uint8Array(16)));

        await set(KEY_VECTOR, iv);
        resolve(iv);
      });
    });
  }

  public async get(key: string): Promise<string | null> {
    const encryptKey = await await this.encryptKey;
    const encrypted = await get<ArrayBuffer>(key);

    if (encrypted) {
      const decoder = new TextDecoder();
      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-CBC', iv: await this.iv },
        encryptKey,
        encrypted,
      );
      return decoder.decode(decrypted);
    }
    return null;
  }

  public async set(key: string, value: string): Promise<void> {
    const encoder = new TextEncoder();
    const encryptKey = await await this.encryptKey;

    try {
      await set(
        key,
        await crypto.subtle.encrypt(
          { name: 'AES-CBC', iv: await this.iv },
          encryptKey,
          encoder.encode(value).buffer,
        ),
      );
    } catch (error) {
      console.error(error);
    }
  }

  public async remove(key: string): Promise<void> {
    await remove(key);
  }
}
