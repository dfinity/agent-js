import * as React from "react";
import * as reducer from "./reducer";
import { IdentityProviderState } from "./state";
import { IdentityProviderAction } from "./action";

/**
 * React Hook to useState for IdentityProvider, with async effects + reducer.
 * @todo(bengo): Make this delegate to the more-generic useReducer below.
 */
export function useState(initialState?: IdentityProviderState) {
    const [state, reducerDispatch] = React.useReducer(reducer.reduce, initialState, reducer.init)
    const dispatch: React.Dispatch<IdentityProviderAction> = (action) => {
        reducerDispatch(action);
        reducer.effector(dispatch)(action);
    }
    return [state, dispatch] as const;
}

export interface IReducerObject<State, Action> {
    init(): State
    reduce(state: State, action: Action): State
    effect(action: Action): undefined|Promise<Action[]>
  }
  
type EffectAction<T=any> =
| { type: "EffectStart", payload: { id: string, promise: Promise<T> }}
| { type: "EffectEnd", payload: { id: string, promise: Promise<T> }}

/**
 * Use a reducer that also has init() and effect()
 * @param reducer 
 */
export function useReducer<S, A>(reducer: IReducerObject<S, A|EffectAction>): [S, React.Dispatch<A>] {
    const [state, reducerDispatch] = React.useReducer(reducer.reduce, undefined, reducer.init);
    async function dispatch (action: A|EffectAction): Promise<void> {
      reducerDispatch(action);
      const effectPromise = reducer.effect(action);
      const effectId = Math.random().toString().slice(2)
      if (effectPromise) {
        dispatch({
          type: "EffectStart",
          payload: {
            id: effectId,
            promise: effectPromise
          }
        });
        for (const effect of (await effectPromise)) {
          dispatch(effect);
        }
        dispatch({
          type: "EffectEnd",
          payload: {
            id: effectId,
            promise: effectPromise
          }
        })
      }
    }
    return [state, dispatch]
  }
  