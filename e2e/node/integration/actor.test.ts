import { HttpAgent } from '@dfinity/agent';
import { HttpAgent as HttpAgentv1 } from 'agent1';
import { createActor } from '../canisters/counter';
import { vi, test } from 'vitest';

vi.useRealTimers();
test("Legacy Agent interface should be accepted by Actor's createActor", async () => {
  const actor = await createActor(
    {},
    new HttpAgentv1({
      host: `http://127.0.0.1:${process.env.REPLICA_PORT ?? 4943}`,
    }) as unknown as HttpAgent,
  );

  await actor.write(8n); //?
  await actor.read(); //?
}, 15_000);
// TODO: tests for rejected, unknown time out
