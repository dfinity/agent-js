import { Codec } from './state-serialization';
import { ValidationError } from 'io-ts';
import { PathReporter } from 'io-ts/lib/PathReporter';
import { pipe } from 'fp-ts/lib/function';
import { fold, left } from 'fp-ts/lib/Either';

export interface IStorage<T> {
  get(): T;
  set(input: T): void;
}

/**
 * Storage that stores objects of type Decoded by first encoding them to type=Encoded via an io-ts Codec<Decoded,unknown,Encoded>
 * Use Cases:
 * * use a SerializedStorage<StateShape,string> to store encoded strings in localStorage
 * @param encodedStorage - underlying storage object for encoded values
 * @param codec - codec that can encode A->O and decode O->A.
 */
export function SerializedStorage<Decoded, Encoded>(encodedStorage: IStorage<Encoded>, codec: Codec<Decoded, unknown, Encoded>): IStorage<Decoded> {
  return Object.freeze({ get, set });
  function get() {
    const stored = encodedStorage.get();
    if (!stored) {
      throw new NotFoundError();
    }
    const decoded = pipe(
      codec.decode(stored),
      fold(
        errors => {
          throw new SerializedStateDecodingError('error decoding SerializedStorage', errors);
        },
        state => state,
      ),
    );
    console.debug('SerializedStorage.get', { stored, decoded });
    return decoded;
  }
  function set(input: Decoded) {
    const encoded = codec.encode(input);
    console.debug('SerializedStorage.set', { input, encoded });
    encodedStorage.set(encoded);
  }
}

export class NotFoundError extends Error {}
/** Error decoding SerializedState back to State */
export class SerializedStateDecodingError extends Error {
  constructor(message: string, public validationErrors: ValidationError[]) {
    super();
  }
  reportErrors(): string[] {
    return PathReporter.report(left(this.validationErrors));
  }
}

/**
 * string Storage that stores data in a single DOM localStorage key.
 * @param key - localStorage key to use to store data
 * @param localStorage - window.localStorage or similar object
 */
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
