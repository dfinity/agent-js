import * as React from "react";
import { IEffectiveReducer, handleEffect, EffectRequested, EffectLifecycleAction } from "./reducer-effects";
import { AnyStandardAction } from "./action";

/**
 * Use a reducer that also has init() and effect()
 * @param reducer 
 */
export function useReducer<
  K extends string,
  S extends Record<K,any>,
  SyncAction extends AnyStandardAction,
>(
  reducer: IEffectiveReducer<S, (EffectLifecycleAction|SyncAction)>,
  initArg?: S|undefined
): [S, React.Dispatch<(EffectLifecycleAction|SyncAction)>] {
    const [state, reducerDispatch] = React.useReducer(reducer.reduce, initArg || reducer.init());
    async function dispatch(action: EffectLifecycleAction|SyncAction): Promise<void> {
      reducerDispatch(action);
      const effect = reducer.effect(action);
      if (effect) {
        switch (effect.type) {
          case "EffectRequested":
            await handleEffect(reducerDispatch, effect as EffectRequested<SyncAction>)
        }
      }
    }
    return [state, dispatch]
  }
