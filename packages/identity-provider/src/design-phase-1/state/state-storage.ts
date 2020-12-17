import { Codec } from './state-serialization';

export interface IStorage<T> {
  get(): T;
  set(input: T): void;
}

export function SerializedStorage<A, O>(oStorage: IStorage<O>, codec: Codec<A, unknown, O>) {
  return Object.freeze({ get, set });
  function get() {
    const stored = oStorage.get();
    const decoded = codec.decode(stored);
    console.debug('SerializedStorage.get', { stored, decoded });
    return decoded;
  }
  function set(input: A) {
    const encoded = codec.encode(input);
    console.debug('SerializedStorage.set', { input, encoded });
    oStorage.set(encoded);
  }
}

export class NotFoundError extends Error {}

export function LocalStorageKey(
  key: string,
  localStorage: typeof globalThis.localStorage = globalThis.localStorage,
): IStorage<string> {
  return Object.freeze({
    get() {
      const value = localStorage.getItem(key);
      if (value === null) {
        throw new NotFoundError();
      }
      return value;
    },
    set(value) {
      localStorage.setItem(key, value);
    },
  });
}
