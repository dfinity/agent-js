import { getManagementCanister, uint8FromBufLike } from '@dfinity/agent';
import { describe, it, expect } from 'vitest';
import logsActor from '../canisters/logs';
import { makeAgent } from '../utils/agent';

describe('canister logs', () => {
  it('should make requests to the management canister', async () => {
    const { canisterId } = await logsActor();

    const management = await getManagementCanister({ agent: await makeAgent() });
    const logs = await management.fetch_canister_logs({ canister_id: canisterId });

    expect(logs.canister_log_records.length).toBe(1);
    const content = uint8FromBufLike(logs.canister_log_records[0].content);

    expect(new TextDecoder().decode(content).trim()).toBe('Hello, first call!');
  });
  it('should show additional logs', async () => {
    const { canisterId, actor } = await logsActor();

    await actor.hello('second call');

    const management = await getManagementCanister({ agent: await makeAgent() });
    const logs = await management.fetch_canister_logs({ canister_id: canisterId });

    expect(logs.canister_log_records.length).toBe(2);
    const content = uint8FromBufLike(logs.canister_log_records[1].content);

    expect(new TextDecoder().decode(content).trim()).toBe('Hello, second call!');
  });
}, 10_000);
