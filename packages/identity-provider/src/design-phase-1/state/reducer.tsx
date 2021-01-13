import * as React from "react";
import { IdentityProviderState as State, IdentityProviderState } from "./state";
import { IdentityProviderAction as Action } from "./action";
import { hexEncodeUintArray } from "../../bytes";
import produce from "immer";
import { combineReducers } from "redux";
import * as authenticationReducer from "./reducers/authentication";
import * as delegationReducer from "./reducers/delegation";
import * as rootIdentityReducer from "./reducers/rootIdentity";

/**
 * Wraps a dispatch into a new dispatch with side effects.
 * Put everything here that should happen as a side effect to an action.
 * @param dispatch 
 */
export function effector(forwardDispatch: React.Dispatch<Action>): React.Dispatch<Action> {
    function dispatch (action: Action) {
        console.log('main reducer effector', action)
        switch(action.type) {
            case "Navigate":
                globalThis.location.assign(action.payload.href)
                break;
            case "StateStored":
                console.debug('StateStored', action);
                break;
            case "AuthenticationRequestReceived":
            case "AuthenticationResponsePrepared":
            case "AuthenticationRequestConsentReceived":
                authenticationReducer.effector(innerDispatch)(action);
                break;
            case "ProfileCreated":
            case "reset":
            case "DelegationRootSignerChanged":
                break;
            default:
                let x: never = action
        }
    }
    /**
     * Dispatch actions back through `dispatch` + forward to `forwardDispatch`
     * This is meant to be provided to delegee dispatchers.
     */
    function innerDispatch (action: Action) {
        forwardDispatch(action);
        dispatch(action);
    }
    return dispatch
}

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