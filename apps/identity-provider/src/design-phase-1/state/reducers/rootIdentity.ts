import * as t from 'io-ts';
import { createSignIdentity } from './authentication';
import { hexEncodeUintArray } from '../../../bytes';

const Ed25519SignerCodec = t.type({
  type: t.literal('Ed25519Signer'),
  credential: t.type({
    secretKey: t.type({
      hex: t.string,
    }),
  }),
});
type Ed25519Signer = t.TypeOf<typeof Ed25519SignerCodec>;

const WebAuthnIdentitySignerCodec = t.type({
  type: t.literal('WebAuthnIdentitySigner'),
  json: t.string,
});
type WebAuthnIdentitySigner = t.TypeOf<typeof WebAuthnIdentitySignerCodec>;

export type Action =
  | { type: 'reset' }
  | {
      type: 'DelegationRootSignerChanged';
      payload: {
        signer: Ed25519Signer | WebAuthnIdentitySigner;
      };
    };

const SignerCodec = t.union([Ed25519SignerCodec, WebAuthnIdentitySignerCodec]);

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
      signer: SignerCodec,
    }),
  ]),
});

export type State = t.TypeOf<typeof StateCodec>;

/**
 * Reduce oldState + action -> newState.
 * @param state - state to update
 * @param action - action to use to update state
 * @returns new state
 */
export function reduce(state: State | undefined = init(), action: Action): State {
  switch (action.type) {
    case 'reset':
      return init();
    case 'DelegationRootSignerChanged':
      return {
        ...state,
        publicKey: {
          hex: hexEncodeUintArray(createSignIdentity(action.payload.signer).getPublicKey().toDer()),
        },
        sign: {
          signer: action.payload.signer,
        },
      };
  }
  return state;
}

/**
 * Create initial state
 */
export function init(): State {
  return {
    publicKey: undefined,
    sign: undefined,
  };
}
