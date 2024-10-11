import { describe, it, expect } from 'vitest';
import { ActorMethod, Actor } from '@dfinity/agent';

export const idlFactory = ({ IDL }) => {
  return IDL.Service({
    Throw: IDL.Func([], [], []),
    test: IDL.Func([], [], []),
  });
};

export interface _SERVICE {
  Throw: ActorMethod<[], undefined>;
  test: ActorMethod<[], undefined>;
}

describe('trap', () => {
  it('should trap', async () => {
    const actor = createActor<_SERVICE>(idlFactory, canisterId);
    const result = await actor.Throw();

    expect(result).toBeUndefined();
  });
});
