import { WebAuthnIdentity } from '@dfinity/authentication';
import { IReducerObject } from '../state-react';
import { hexEncodeUintArray, hexToBytes } from '../../../bytes';

export interface State {}

export type Action =
  | {
      type: 'WebAuthn/reset';
      payload: undefined;
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
}): IReducerObject<State, Action> {
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
  function effect(action: Action): undefined | Promise<Action[]> {
    switch (action.type) {
      case 'WebAuthn/publicKeyCredentialRequested':
        return (async () => {
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
        })();
      default:
    }
  }
}
