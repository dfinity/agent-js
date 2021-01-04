import * as React from "react";
import * as reducer from "./reducer";
import { IdentityProviderState } from "./state";
import { IdentityProviderAction } from "./action";

export function useState(initialState?: IdentityProviderState) {
    const [state, reducerDispatch] = React.useReducer(reducer.reduce, initialState, reducer.init)
    const dispatchWithEffects: React.Dispatch<IdentityProviderAction> = reducer.effector(reducerDispatch);
    return [state, dispatchWithEffects] as const;
}
