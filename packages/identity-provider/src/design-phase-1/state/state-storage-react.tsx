import * as React from "react";
import { IStorage } from "./state-storage";

export type StateStoredAction = {
    type: "StateStored",
    state: any,
}

export function useStateStorage<State>(
    storage: IStorage<State>,
    state: State,
    dispatch: React.Dispatch<StateStoredAction>
) {
    React.useEffect(
        () => {
            storage.set(state)
            dispatch({
                type: "StateStored",
                state,
            })
        },
        [state]
    )
}
