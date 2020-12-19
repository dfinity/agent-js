import * as React from "react";
import { IdentityProviderState as State, IdentityProviderState } from "./state";
import { IdentityProviderAction as Action, IdentityProviderAction } from "./action";
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
export function effector(dispatch: React.Dispatch<IdentityProviderAction>): React.Dispatch<IdentityProviderAction> {
    return (action) => {
        dispatch(action);
        console.log('effector', action)
        switch(action.type) {
            case "Navigate":
                globalThis.location.assign(action.payload.href)
                break;
            case "StateStored":
                console.debug('StateStored', action);
                break;
        }
    }
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