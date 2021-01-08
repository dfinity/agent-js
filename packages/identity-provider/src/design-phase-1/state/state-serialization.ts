import { pipe } from 'fp-ts/lib/function';
import { left, fold } from 'fp-ts/lib/Either';
import * as t from 'io-ts';

export interface Codec<A, I, O> {
  encode(value: A): O;
  decode(input: I): A;
}

/**
 * When JSON.stringify is not enough, consider using io-ts Codecs to make these composable.
 */
export function StateToStringCodec<State>(
  StateCodec: t.Type<State>,
): Codec<State, unknown, string> {
  return Object.freeze({ encode, decode });
  function encode(state: State): string {
    return JSON.stringify(state);
  }
  function decode(input: unknown): State {
    if (typeof input !== 'string') {
      throw new TypeError('input must be a string');
    }
    return pipe(
      StateCodec.decode(JSON.parse(input)),
      fold(
        errors => {
          throw errors;
        },
        s => s,
      ),
    );
  }
}

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
