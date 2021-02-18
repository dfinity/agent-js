import { Either } from 'fp-ts/lib/Either';
import * as t from 'io-ts';

export interface Codec<A, I, O> {
  encode(value: A): O;
  decode(input: I): Either<t.Errors, A>;
}

/**
 * Given a Codec, return another Codec that encodes to a string using JSON.stringify.
 * @param StateCodec - io-ts Codec for state object
 */
export function StateToStringCodec<State>(
  StateCodec: t.Type<State>,
): Codec<State, unknown, string> {
  return Object.freeze({ encode, decode });
  function encode(state: State): string {
    return JSON.stringify(state);
  }
  function decode(input: unknown) {
    if (typeof input !== 'string') {
      throw new TypeError('input must be a string');
    }
    return StateCodec.decode(JSON.parse(input));
  }
}

/**
 * Codec combinator to add a default value.
 * @param type - io-ts Type to wrap with default
 * @param defaultValue - default to use for `type`
 */
export function withDefault<T extends t.Mixed>(
  type: T,
  defaultValue: t.TypeOf<T>,
): t.Type<t.TypeOf<T>, t.TypeOf<T>, unknown> {
  return new t.Type(
    `withDefault(${type.name}, ${JSON.stringify(defaultValue)})`,
    type.is,
    v => type.decode(v != null ? v : defaultValue),
    type.encode,
  );
}
