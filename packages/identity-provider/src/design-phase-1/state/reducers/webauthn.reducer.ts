import { WebAuthnIdentity } from '@dfinity/authentication';
import { IEffectiveReducer, EffectRequested } from '../reducer-effects';
import { hexEncodeUintArray, hexToBytes } from '../../../bytes';

export interface State {}

export type Action =
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

export default function WebAuthnReducer(spec: {
  /** Useful for logging effects */
  forEachAction?(action: Action): void;
  WebAuthn: {
    create(): Promise<WebAuthnIdentity>;
  };
}): IEffectiveReducer<State, Action> {
  return Object.freeze({ init, reduce, effect });
  function init(): State {
    return {};
  }
  function reduce(state: State, action: Action): State {
    if (spec.forEachAction) spec.forEachAction(action);
    switch (action.type) {
      case 'WebAuthn/reset':
        return init();
    }
    return state;
  }
  function effect(action: Action): undefined | EffectRequested<Action> {
    switch (action.type) {
      case 'WebAuthn/publicKeyCredentialRequested':
        return {
          type: 'EffectRequested',
          payload: {
            async effect() {
              const webAuthnIdentity = await spec.WebAuthn.create();
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
}
