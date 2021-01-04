import * as icid from '../../../protocol/ic-id-protocol';
import * as t from 'io-ts';

export type Action =
  | { type: 'reset' }
  | { type: 'AuthenticationRequestReceived'; payload: icid.AuthenticationRequest };

export const StateCodec = t.type({
  request: t.union([
    t.undefined,
    t.type({
      type: t.literal('AuthenticationRequest'),
      redirectUri: t.string,
      sessionIdentity: t.type({
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
        request: action.payload,
      };
  }
  return state;
}

export function init(): State {
  return {
    request: undefined,
  };
}
