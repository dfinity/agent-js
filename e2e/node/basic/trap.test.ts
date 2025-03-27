import { describe, it, expect } from 'vitest';
import { ActorMethod, Actor, HttpAgent } from '@dfinity/agent';
import util from 'util';
import exec from 'child_process';
const execAsync = util.promisify(exec.exec);

// eslint-disable-next-line prefer-const
let stdout;
try {
  ({ stdout } = await execAsync('dfx canister id trap'));
} catch {
  await execAsync('dfx deploy trap');
  ({ stdout } = await execAsync('dfx canister id trap'));
}

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
    const canisterId = stdout.trim();
    const agent = await HttpAgent.create({
      host: 'http://localhost:4943',
      shouldFetchRootKey: true,
    });
    const actor = Actor.createActor<_SERVICE>(idlFactory, { canisterId, agent });
    try {
      await actor.Throw();
    } catch (error) {
      console.log(error);
      expect(error.reject_message).toBe('foo');
    }
  });
  it('should trap', async () => {
    const canisterId = stdout.trim();
    const agent = await HttpAgent.create({
      host: 'http://localhost:4943',
      shouldFetchRootKey: true,
    });
    const actor = Actor.createActor<_SERVICE>(idlFactory, { canisterId, agent });
    try {
      await actor.test();
    } catch (error) {
      expect(error.reject_message).toContain('trapping');
    }
  });
});
