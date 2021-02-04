import { AnyStandardAction } from './action';

export interface IEffectiveReducer<State, Action extends AnyStandardAction> {
  init(initialState?: State | undefined): State;
  reduce(state: State, action: Action): State;
  effect(state: State, action: Action): undefined | EffectRequested<Action>;
}

export type EffectLifecycleAction =
  | { type: 'EffectStart'; payload: { id: string } }
  | { type: 'EffectEnd'; payload: { id: string } };

export type EffectRequested<Action> = {
  type: 'EffectRequested';
  payload: {
    effect(): Promise<Action[] | void>;
  };
};

/**
 * Handle a given effect, returning a promise of the effect being fully handled.
 * @param dispatch - call this to dispatch more actions
 * @param effect - effect to handle
 */
export async function handleEffect<A extends AnyStandardAction>(
  dispatch: (action: A | EffectLifecycleAction) => void,
  effect: EffectRequested<A>,
): Promise<void> {
  switch (effect.type) {
    case 'EffectRequested':
      await (async () => {
        const { effect: doEffect } = (effect as EffectRequested<A>).payload;
        const effectId = Math.random().toString().slice(2);
        dispatch({
          type: 'EffectStart',
          payload: {
            id: effectId,
          },
        });
        for (const innerEffect of (await doEffect()) || []) {
          switch (innerEffect.type) {
            case 'EffectRequested':
              // unwind nested EffectRequests
              await handleEffect(dispatch, innerEffect as EffectRequested<A>);
              break;
            default:
              dispatch(innerEffect);
          }
        }
        dispatch({
          type: 'EffectEnd',
          payload: {
            id: effectId,
          },
        });
      })();
      break;
    default: {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const x: never = effect.type;
    }
  }
}
