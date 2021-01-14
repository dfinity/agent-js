import { WebAuthnIdentity } from '@dfinity/authentication';
import { IEffectiveReducer, EffectRequested } from '../reducer-effects';
import { hexEncodeUintArray, hexToBytes } from '../../../bytes';
import { StubbedWebAuthn } from 'src/webauthn/StubbedWebAuthn';
import * as t from 'io-ts';

export const StateCodec = t.type({
  webAuthnWorks: t.boolean,
});
export type State = t.TypeOf<typeof StateCodec>;

export type Action =
  | { type: 'reset' }
  | {
      type: 'WebAuthn/reset';
    }
  | {
      type: 'WebAuthn/publicKeyCredentialRequested';
    }
  | {
      type: 'WebAuthn/publicKeyCredentialCreated';
      payload: {
        credential: {
          id: {
            hex: string;
          };
          publicKey: { hex: string };
        };
      };
    };

export function WebAuthnReducer(
  spec: {
    /** Useful for logging effects */
    forEachAction?(action: Action): void;
    WebAuthn: {
      create(): Promise<WebAuthnIdentity>;
    };
  } = {
    WebAuthn: StubbedWebAuthn(),
  },
): IEffectiveReducer<State, Action> {
  return Object.freeze({ init, reduce: wrappedReduce, effect });
  function wrappedReduce(state: State | undefined = init(), action: Action): State {
    if (spec.forEachAction) spec.forEachAction(action);
    return reduce(state, action);
  }
}

export function init(): State {
  return {
    webAuthnWorks: true,
  };
}

export function reduce(state: State | undefined = init(), action: Action): State {
  switch (action.type) {
  }
  return state;
}

export function effect(state: State, action: Action): undefined | EffectRequested<Action> {
  switch (action.type) {
    case 'WebAuthn/publicKeyCredentialRequested':
      return {
        type: 'EffectRequested',
        payload: {
          async effect() {
            const webAuthnIdentity = await StubbedWebAuthn().create();
            const publicKeyCredentialCreated: Action = {
              type: 'WebAuthn/publicKeyCredentialCreated' as const,
              payload: {
                credential: {
                  id: { hex: 'todoCredentialId' },
                  publicKey: {
                    hex: hexEncodeUintArray(webAuthnIdentity.getPublicKey().toDer()),
                  },
                },
              },
            };
            return [publicKeyCredentialCreated];
          },
        },
      };
    default:
  }
  return;
}
