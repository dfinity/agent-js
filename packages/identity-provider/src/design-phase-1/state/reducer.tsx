import * as React from "react";
import { IdentityProviderState as State } from "./state";
import { IdentityProviderAction as Action, IdentityProviderAction } from "./action";
import { hexEncodeUintArray } from "src/bytes";

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

/** Reduce a new action + old state into a new state */
export function reduce(state: State=init(), action: Action): State {
    switch (action.type) {
        case "AuthenticationRequestReceived":
            return {
                ...state,
                loginHint: action.payload.loginHint,
            }
        case "ProfileCreated":
            return {...state,
                identities: {
                    ...state.identities,
                    root: {
                        ...state.identities.root,
                        publicKey: {
                            hex: hexEncodeUintArray(new Uint8Array(action.payload.publicKey))
                        }
                    }
                }
            }
        case "reset":
            return init();
        case "StateStored":
            return state;
        case "Navigate":
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
        identities: {
            root: {
                publicKey: undefined
            },
        }
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
