import * as React from "react";
import { IdentityProviderState as State } from "./state";
import { IdentityProviderAction as Action, IdentityProviderAction } from "./action";

/**
 * Wraps a dispatch into a new dispatch with side effects.
 * Put everything here that should happen as a side effect to an action.
 * @param dispatch 
 */
export function effector(dispatch: React.Dispatch<IdentityProviderAction>): React.Dispatch<IdentityProviderAction> {
    return (action) => {
        dispatch(action);
        switch(action.type) {
            case "StateStored":
                console.debug('StateStored', action);
                break;
        }
    }
}

/** Reduce a new action + old state into a new state */
export function reduce(state: State=init(), action: Action): State {
    switch (action.type) {
        case "AuthenticationRequestReceived":
            return {
                ...state,
                loginHint: action.payload.loginHint,
            }
        case "reset":
            return init();
        case "StateStored":
            return state;
        default:
            let x: never = action;
    }
    throw new Error(`unexpected action`)
}

/** Produce initial State */
export function init(initialState?: State): State {
    if (initialState) return initialState;
    return {
        type: 'IdentityProviderState',
        loginHint: undefined,
    } 
}

export function useReducer(initialState?: State): [State, React.Dispatch<Action>] {
    const [state, dispatch] = React.useReducer(
        reduce,
        initialState,
        init,
    );
    return [state, dispatch];
}
