import * as React from 'react';
import { IStorage } from './state-storage';

export type StateStoredAction<S> = {
  type: 'StateStored';
  payload: { state: S };
};

/**
 * React hook to make use of Stored state.
 * Whenever state changes, use the store to save it.
 * @param storage - object used to store state
 * @param state - state to be stored
 * @param dispatch - called with StateStored action whenever state is set
 */
export function useStateStorage<State>(
  storage: IStorage<State>,
  state: State,
  dispatch: React.Dispatch<StateStoredAction<State>>,
): void {
  React.useEffect(() => {
    storage.set(state);
    dispatch({
      type: 'StateStored',
      payload: { state },
    });
  }, [state]);
}
