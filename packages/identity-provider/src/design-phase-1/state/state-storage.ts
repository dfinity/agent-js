import { Codec } from './state-serialization';
import { ValidationError } from 'io-ts';
import { PathReporter } from 'io-ts/lib/PathReporter';
import { pipe } from 'fp-ts/lib/function';
import * as t from 'io-ts';
import { fold, left } from 'fp-ts/lib/Either';

export interface IStorage<T> {
  get(): T;
  set(input: T): void;
}

export function SerializedStorage<A, O>(oStorage: IStorage<O>, codec: Codec<A, unknown, O>) {
  return Object.freeze({ get, set });
  function get() {
    const stored = oStorage.get();
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
  function set(input: A) {
    const encoded = codec.encode(input);
    console.debug('SerializedStorage.set', { input, encoded });
    oStorage.set(encoded);
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
