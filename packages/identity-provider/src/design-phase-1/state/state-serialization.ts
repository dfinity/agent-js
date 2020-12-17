import { JsonnableIdentityProviderState as State, IdentityProviderStateType } from './state';
import { pipe } from 'fp-ts/lib/function';
import { left, fold } from 'fp-ts/lib/Either';

export interface Codec<A, I, O> {
  encode(value: A): O;
  decode(input: I): A;
}

/**
 * When JSON.stringify is not enough, consider using io-ts Codecs to make these composable.
 */
export function StateToStringCodec(): Codec<State, unknown, string> {
  return Object.freeze({ encode, decode });
  function encode(state: State): string {
    return JSON.stringify(state);
  }
  function decode(input: unknown): State {
    if (typeof input !== 'string') {
      throw new TypeError('input must be a string');
    }
    return pipe(
      IdentityProviderStateType.decode(JSON.parse(input)),
      fold(
        errors => {
          throw errors;
        },
        s => s,
      ),
    );
  }
}
