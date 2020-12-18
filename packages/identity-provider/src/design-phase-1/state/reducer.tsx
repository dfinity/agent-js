import * as React from "react";
import { IdentityProviderState as State } from "./state";
import { IdentityProviderAction as Action, IdentityProviderAction } from "./action";
import { hexEncodeUintArray } from "../../bytes";
import produce from "immer";

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
            return produce(state, newState => {
                Object.assign(newState, {
                    authenticationRequest: action.payload,
                    delegation: {
                        target: {
                            publicKey: {
                                hex: action.payload.sessionIdentity.hex,
                            }
                        }
                    }
                })
            });
        case "ProfileCreated":
            return {...state,
                identities: {
                    ...state.identities,
                    root: {
                        ...state.identities?.root,
                        publicKey: {
                            hex: action.payload.publicKey.hex,
                        }
                    }
                }
            }
        case "DelegationRootSignerChanged":
            return {
                ...state,
                identities: {
                    ...state.identities,
                    root: {
                        ...state?.identities?.root,
                        sign: {
                            secretKey: {
                                hex: action.payload.secretKey.hex
                            }
                        }
                    }
                }
            }
        case "reset":
            return init();
        case "StateStored":
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
