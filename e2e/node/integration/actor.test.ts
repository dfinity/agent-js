import { HttpAgent } from '@dfinity/agent';
import { HttpAgent as HttpAgentv1 } from 'agent1';
import { createActor } from '../canisters/counter';
import { vi, test, expect } from 'vitest';

vi.useRealTimers();
test("Legacy Agent interface should be accepted by Actor's createActor", async () => {
  // Use the v1.4.0 agent to create an actor
  const actor = await createActor(
    {},
    new HttpAgentv1({
      host: `http://127.0.0.1:${process.env.REPLICA_PORT ?? 4943}`,
    }) as unknown as HttpAgent,
  );

  // Verify that update calls work
  await actor.write(8n); //?
  // Verify that query calls work
  const count = await actor.read(); //?
  expect(count).toBe(8n);
}, 15_000);
// TODO: tests for rejected, unknown time out
