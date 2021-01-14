import * as React from "react";
import { IdentityProviderState as State } from "./state";
import { IdentityProviderAction as Action } from "./action";
import { hexEncodeUintArray } from "../../bytes";
import produce from "immer";
import { combineReducers } from "redux";
import * as authenticationReducer from "./reducers/authentication";
import * as delegationReducer from "./reducers/delegation";
import * as rootIdentityReducer from "./reducers/rootIdentity";
import * as webAuthnReducer from "./reducers/webauthn.reducer";
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
        effect,
        init,
        reduce,
    })
}

export function effect(state: State, action: Action): undefined | EffectRequested<Action> {
    switch (action.type) {
        case "EffectRequested":
            console.log('design-phase-1/reducer/Effector EffectRequested (term)', action)
            break;
        case "Navigate":
            const navigateViaLocationAssignEffect: EffectRequested<Action> = {
                type: "EffectRequested" as const,
                payload: {
                    async effect(): Promise<void> {
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
            return webAuthnReducer.effect(state.webAuthn, action);
        case "reset":
        case "ProfileCreated":
        case "DelegationRootSignerChanged":
            break;
        default:
            let x: never = action;
    }
    return;
}

export const reduce = function (state: State|undefined, action: Action): State {
    const newState = combineReducers({
        authentication: authenticationReducer.reduce,
        delegation: delegationReducer.reduce,
        identities: combineReducers({
            root: rootIdentityReducer.reduce,
        }),
        webAuthn: webAuthnReducer.reduce
    })(state, action);
    return newState;
}

export function init(initialState?: State|undefined): State {
    return initialState||{
        authentication: authenticationReducer.init(),
        delegation: delegationReducer.init(),
        identities: {
            root: rootIdentityReducer.init(),
        },
        webAuthn: webAuthnReducer.init(),
    }
}
