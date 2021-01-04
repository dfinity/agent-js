import * as icid from '../../../protocol/ic-id-protocol';
import * as t from 'io-ts';

export type Action =
  | { type: 'reset' }
  | {
      type: 'ProfileCreated';
      payload: {
        publicKey: {
          hex: string;
        };
      };
    }
  | {
      type: 'DelegationRootSignerChanged';
      payload: {
        secretKey: { hex: string };
      };
    };

export const StateCodec = t.type({
  publicKey: t.union([
    t.undefined,
    t.type({
      hex: t.string,
    }),
  ]),
  sign: t.union([
    t.undefined,
    t.type({
      secretKey: t.type({
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
    case 'ProfileCreated':
      return {
        ...state,
        publicKey: {
          hex: action.payload.publicKey.hex,
        },
      };
    case 'DelegationRootSignerChanged':
      return {
        ...state,
        sign: {
          secretKey: {
            hex: action.payload.secretKey.hex,
          },
        },
      };
  }
  return state;
}

export function init(): State {
  return {
    publicKey: undefined,
    sign: undefined,
  };
}
