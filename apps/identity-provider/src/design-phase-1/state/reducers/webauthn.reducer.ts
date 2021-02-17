import { WebAuthnIdentity } from '@dfinity/authentication';
import { IEffectiveReducer, EffectRequested } from '../reducer-effects';
import { hexEncodeUintArray } from '../../../bytes';
import * as t from 'io-ts';
import { withDefault } from '../state-serialization';

export const StateCodec = t.intersection([
  t.type({
    webAuthnWorks: t.boolean,
  }),
  t.partial({
    publicKeyCredential: withDefault(
      t.union([
        t.undefined,
        t.type({
          publicKey: t.type({
            hex: t.string,
          }),
        }),
      ]),
      undefined,
    ),
  }),
]);

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

/**
 * Reducer for WebAuthn State.
 * @param spec spec
 * @param spec.forEachAction - if provided, called with each action reduced
 * @param spec.WebAuthnIdentity - can create WebAuthnIdentity instances (non-browser requires a stub)
 */
export function WebAuthnReducer(spec: {
  /** Useful for logging effects */
  forEachAction?(action: Action): void;
  WebAuthnIdentity: Pick<typeof WebAuthnIdentity, 'create'>;
}): IEffectiveReducer<State, Action> {
  return Object.freeze({ init, reduce: wrappedReduce, effect: effector(spec) });
  function wrappedReduce(state: State | undefined = init(), action: Action): State {
    if (spec.forEachAction) spec.forEachAction(action);
    return reduce(state, action);
  }
}

/**
 * Create initial state
 */
export function init(): State {
  return {
    webAuthnWorks: true,
  };
}

/**
 * Reduce (oldState + action) => newState
 * @param state - previous state
 * @param action - new action to use to update state
 * @returns updated state
 */
export function reduce(state: State | undefined = init(), action: Action): State {
  switch (action.type) {
    case 'WebAuthn/publicKeyCredentialCreated':
      return {
        ...state,
        publicKeyCredential: {
          publicKey: action.payload.credential.publicKey,
        },
      };
  }
  return state;
}

/**
 * Create EffectConstructor for webauthn functionality.
 * Handles:
 * * WebAuthn/publicKeyCredentialRequested
 *   * EffectRequested: use WebAuthnIdentity to create a new publicKeyCredential,
 *     then dispatch WebAuthn/publicKeyCredentialCreated
 * @param spec spec
 * @param spec.WebAuthnIdentity - can create WebAuthnIdentity instances (non-browser requires a stub)
 */
export function effector(spec: {
  WebAuthnIdentity: Pick<typeof WebAuthnIdentity, 'create'>;
}): IEffectiveReducer<State, Action>['effect'] {
  return function (state: State, action: Action): undefined | EffectRequested<Action> {
    switch (action.type) {
      case 'WebAuthn/publicKeyCredentialRequested':
        return {
          type: 'EffectRequested',
          payload: {
            async effect() {
              const webAuthnIdentity = await spec.WebAuthnIdentity.create();
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
  };
}
