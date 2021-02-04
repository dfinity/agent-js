import * as React from "react";
import { IEffectiveReducer, handleEffect, EffectRequested, EffectLifecycleAction } from "./reducer-effects";
import { AnyStandardAction } from "./action";

/**
 * Like React.useReducer, but can handle EffectiveReducers (i.e. { init, effect, reduce })
 * @param reducer - reducer object to use in this react hook context
 * @param initArg - initial state
 */
export function useReducer<
  S,
  A extends AnyStandardAction,
>(
  reducer: IEffectiveReducer<S, A|EffectLifecycleAction>,
  initArg?: S|undefined
): [S, React.Dispatch<A>] {
    const [state, reducerDispatch] = React.useReducer(reducer.reduce, initArg, reducer.init);
    async function dispatch(action: A): Promise<void> {
      reducerDispatch(action);
      const effect = reducer.effect(state, action);
      if (effect) {
        switch (effect.type) {
          case "EffectRequested":
            await handleEffect((action) => {
              reducerDispatch(action);
            }, effect as EffectRequested<A>)
        }
      }
    }
    return [state, dispatch]
  }
