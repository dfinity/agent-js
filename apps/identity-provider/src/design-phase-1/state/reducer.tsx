import { IdentityProviderState as State } from './state';
import { IdentityProviderAction as Action } from './action';
import { combineReducers } from 'redux';
import * as authenticationReducer from './reducers/authentication';
import * as delegationReducer from './reducers/delegation';
import * as rootIdentityReducer from './reducers/rootIdentity';
import * as webAuthnReducer from './reducers/webauthn.reducer';
import { EffectRequested, IEffectiveReducer } from './reducer-effects';
import { WebAuthnIdentity } from '@dfinity/authentication';
import type { History } from 'history';

/**
 * EffectiveReducer for IdentityProvider. Builds initial state and updates state based on known actions.
 * @param spec spec
 * @param spec.forEachAction - called with each action
 * @param spec.history - History object used to control 'Navigate' actions.
 * @param spec.WebAuthnIdentity - can create WebAuthnIdentity instances (non-browser requires a stub)
 */
export default function IdentityProviderReducer(spec: {
  /** Useful for logging effects */
  forEachAction?(action: Action): void;
  history: History;
  WebAuthnIdentity: Pick<typeof WebAuthnIdentity, 'create'>;
}): IEffectiveReducer<State, Action> {
  return Object.freeze({
    effect: Effector(spec),
    init,
    reduce,
  });
}

/**
 * Create function that produces effects for a given action.
 * @param spec spec
 * @param spec.history - History object used to control 'Navigate' actions.
 * @param spec.WebAuthnIdentity - can create WebAuthnIdentity instances (non-browser requires a stub)
 */
export function Effector(spec: {
  history: History;
  WebAuthnIdentity: Pick<typeof WebAuthnIdentity, 'create'>;
}): IEffectiveReducer<State, Action>['effect'] {
  return (state: State, action: Action): undefined | EffectRequested<Action> => {
    switch (action.type) {
      case 'EffectRequested':
        console.log('design-phase-1/reducer/Effector EffectRequested (term)', action);
        break;
      case 'Navigate': {
        const navigateViaLocationAssignEffect: EffectRequested<Action> = {
          type: 'EffectRequested' as const,
          payload: {
            async effect(): Promise<void> {
              const { href } = action.payload;
              const isRelativeHref = (() => {
                try {
                  // if href is relative, this will throw because no second param
                  new URL(href);
                } catch (error) {
                  return true;
                }
                return false;
              })();
              if (isRelativeHref) {
                spec.history.push(href);
              } else {
                globalThis.location.assign(href);
              }
            },
          },
        };
        return navigateViaLocationAssignEffect;
      }
      case 'StateStored':
        return;
      case 'AuthenticationRequestReceived':
      case 'AuthenticationResponsePrepared':
      case 'AuthenticationRequestConsentReceived':
        return authenticationReducer.effect(action);
      case 'WebAuthn/reset':
      case 'WebAuthn/publicKeyCredentialRequested':
      case 'WebAuthn/publicKeyCredentialCreated':
        return webAuthnReducer.effector(spec)(state.webAuthn, action);
      case 'reset':
      case 'DelegationRootSignerChanged':
        break;
      default: {
        // Intentionally exhaustive. If compiler complains, add more cases above to explicitly handle.
        // const x: never = action.type;
      }
    }
    return;
  };
}

export const reduce = function (state: State | undefined, action: Action): State {
  const newState = combineReducers({
    authentication: authenticationReducer.reduce,
    delegation: delegationReducer.reduce,
    identities: combineReducers({
      root: rootIdentityReducer.reduce,
    }),
    webAuthn: webAuthnReducer.reduce,
  })(state, action);
  return newState;
};

/**
 * construct new state.
 * @param initialState - initialState suggested by someone else.
 */
export function init(initialState?: State | undefined): State {
  return (
    initialState || {
      authentication: authenticationReducer.init(),
      delegation: delegationReducer.init(),
      identities: {
        root: rootIdentityReducer.init(),
      },
      webAuthn: webAuthnReducer.init(),
    }
  );
}
