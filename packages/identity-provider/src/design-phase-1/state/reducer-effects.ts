import { AnyStandardAction } from './action';

export interface IEffectiveReducer<State, Action extends AnyStandardAction, InitArg = undefined> {
  init(...args: InitArg[]): State;
  reduce(state: State, action: Action): State;
  effect(action: Action): undefined | EffectRequested<Action>;
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

export async function handleEffect<A extends AnyStandardAction>(
  dispatch: (action: A | EffectLifecycleAction) => void,
  effect: EffectRequested<A>,
) {
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
    default:
      let x: never = effect.type;
  }
}
