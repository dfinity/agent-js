import * as React from "react";
import { IdentityProviderState as State, IdentityProviderState } from "./state";
import { IdentityProviderAction as Action } from "./action";
import { hexEncodeUintArray } from "../../bytes";
import produce from "immer";
import { combineReducers } from "redux";
import * as authenticationReducer from "./reducers/authentication";
import * as delegationReducer from "./reducers/delegation";
import * as rootIdentityReducer from "./reducers/rootIdentity";
import WebAuthnReducer from "./reducers/webauthn.reducer";
import { EffectRequested, IEffectiveReducer } from "./reducer-effects";
import { WebAuthnIdentity } from "@dfinity/authentication";

export default function IdentityProviderReducer(spec: {
    /** Useful for logging effects */
    forEachAction?(action: Action): void;
    WebAuthn: {
      create(): Promise<WebAuthnIdentity>;
    };
  }): IEffectiveReducer<State, Action> {
    return Object.freeze({
        effect: Effector(spec),
        init,
        reduce,
    })
}

export function Effector(spec: {
    /** Useful for logging effects */
    forEachAction?(action: Action): void;
    WebAuthn: {
      create(): Promise<WebAuthnIdentity>;
    };
  }) {
    return function effect(action: Action): undefined | EffectRequested<Action> {
        switch (action.type) {
            case "EffectStart":
            case "EffectEnd":
                break;
            case "EffectRequested":
                console.log('design-phase-1/reducer/Effector EffectRequested (term)', action)
                break;
            case "Navigate":
                const navigateViaLocationAssignEffect: EffectRequested<Action> = {
                    type: "EffectRequested",
                    payload: {
                        async effect() {
                            const { href } = action.payload;
                            globalThis.location.assign(href);
                        }
                    }
                }
                return navigateViaLocationAssignEffect;
            case "StateStored":
                return {
                    type: "EffectRequested",
                    payload: {
                        async effect() {
                            console.debug('StateStored', action)
                        }
                    }
                }
            case "AuthenticationRequestReceived":
            case "AuthenticationResponsePrepared":
            case "AuthenticationRequestConsentReceived":
                return authenticationReducer.effect(action);
            case "WebAuthn/reset":
            case "WebAuthn/publicKeyCredentialRequested":
            case "WebAuthn/publicKeyCredentialCreated":
                const webauthnReducer = WebAuthnReducer(spec)
                return webauthnReducer.effect(action);
            case "reset":
            case "EffectStart":
            case "EffectEnd":
            case "ProfileCreated":
            case "DelegationRootSignerChanged":
                break;
            default:
                let x: never = action;
        }
        return;
    }
}

// /**
//  * Wraps a dispatch into a new dispatch with side effects.
//  * Put everything here that should happen as a side effect to an action.
//  * @param dispatch 
//  */
// export function effector(forwardDispatch: React.Dispatch<Action>): React.Dispatch<Action> {
//     function dispatch (action: Action) {
//         console.log('main reducer effector', action)
//         switch(action.type) {
//             case "Navigate":
//                 globalThis.location.assign(action.payload.href)
//                 break;
//             case "StateStored":
//                 console.debug('StateStored', action);
//                 break;
//             case "AuthenticationRequestReceived":
//             case "AuthenticationResponsePrepared":
//             case "AuthenticationRequestConsentReceived":
//                 authenticationReducer.effector(innerDispatch)(action);
//                 break;
//             case "WebAuthn/publicKeyCredentialCreated":
//             case "WebAuthn/publicKeyCredentialRequested":
//             case "WebAuthn/reset":
//                 console.log('reducer effector got WebAuthn action (#todo refactor)', action);
//                 break;
//             case "ProfileCreated":
//             case "reset":
//             case "DelegationRootSignerChanged":
//                 break;
//             default:
//                 let x: never = action
//         }
//     }
//     /**
//      * Dispatch actions back through `dispatch` + forward to `forwardDispatch`
//      * This is meant to be provided to delegee dispatchers.
//      */
//     function innerDispatch (action: Action) {
//         forwardDispatch(action);
//         dispatch(action);
//     }
//     return dispatch
// }

export const reduce = combineReducers({
    authentication: authenticationReducer.reduce,
    delegation: delegationReducer.reduce,
    identities: combineReducers({
        root: rootIdentityReducer.reduce,
    })
})

export function init(initialState?: State): State {
    return initialState||{
        authentication: authenticationReducer.init(),
        delegation: delegationReducer.init(),
        identities: {
            root: rootIdentityReducer.init(),
        }
    }
}