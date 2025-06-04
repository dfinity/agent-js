import { describe, it, expect } from 'vitest';
import {
  ActorMethod,
  Actor,
  HttpAgent,
  AgentError,
  CertifiedRejectErrorCode,
} from '@dfinity/agent';
import util from 'util';
import exec from 'child_process';
import { IDL } from '@dfinity/candid';
const execAsync = util.promisify(exec.exec);

// eslint-disable-next-line prefer-const
let stdout;
try {
  ({ stdout } = await execAsync('dfx canister id trap'));
} catch {
  await execAsync('dfx deploy trap');
  ({ stdout } = await execAsync('dfx canister id trap'));
}

export const idlFactory: IDL.InterfaceFactory = ({ IDL }) => {
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
    expect.assertions(3);
    try {
      await actor.Throw();
    } catch (error) {
      expect(error).toBeInstanceOf(AgentError);
      const errorCode = (error as AgentError).cause.code;
      expect(errorCode).toBeInstanceOf(CertifiedRejectErrorCode);
      expect((errorCode as CertifiedRejectErrorCode).rejectMessage).toBe('foo');
    }
  });
  it('should trap', async () => {
    const canisterId = stdout.trim();
    const agent = await HttpAgent.create({
      host: 'http://localhost:4943',
      shouldFetchRootKey: true,
    });
    const actor = Actor.createActor<_SERVICE>(idlFactory, { canisterId, agent });
    expect.assertions(3);
    try {
      await actor.test();
    } catch (error) {
      expect(error).toBeInstanceOf(AgentError);
      const errorCode = (error as AgentError).cause.code;
      expect(errorCode).toBeInstanceOf(CertifiedRejectErrorCode);
      expect((errorCode as CertifiedRejectErrorCode).rejectMessage).toContain('trapping');
    }
  });
});
