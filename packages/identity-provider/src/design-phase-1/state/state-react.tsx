import * as React from "react";
import * as reducer from "./reducer";
import { IdentityProviderState } from "./state";
import { IdentityProviderAction } from "./action";

export function useState(initialState?: IdentityProviderState) {
    const [state, reducerDispatch] = React.useReducer(reducer.reduce, initialState, reducer.init)
    const dispatch: React.Dispatch<IdentityProviderAction> = (action) => {
        reducerDispatch(action);
        reducer.effector(dispatch)(action);
    }
    return [state, dispatch] as const;
}
