import * as icid from '../../../protocol/ic-id-protocol';
import * as t from 'io-ts';

export type Action =
  | { type: 'reset' }
  | { type: 'AuthenticationRequestReceived'; payload: icid.AuthenticationRequest };

export const StateCodec = t.type({
  target: t.union([
    t.undefined,
    t.type({
      publicKey: t.type({
        hex: t.string,
      }),
    }),
  ]),
});
export type State = t.TypeOf<typeof StateCodec>;

export function reduce(state: State = init(), action: Action) {
  switch (action.type) {
    case 'reset':
      return init();
    case 'AuthenticationRequestReceived':
      return {
        ...state,
        target: {
          ...state.target,
          publicKey: {
            hex: action.payload.sessionIdentity.hex,
          },
        },
      };
  }
  return state;
}

export function init(): State {
  return {
    target: undefined,
  };
}
