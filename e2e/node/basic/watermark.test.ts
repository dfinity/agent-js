import { test, expect, vi } from 'vitest';
import { createActor } from '../canisters/counter';
import { Actor, HttpAgent } from '@dfinity/agent';

class FetchProxy {
  #history: Response[] = [];
  #replyIndex = 0;

  async fetch(...args): Promise<Response> {
    if (this.#replyIndex) {
      const response = this.#history[this.#replyIndex].clone();
      this.#history.push(response);
      return response;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await(global.fetch as any)(...args);
    this.#history.push(response);
    return response.clone();
  }

  get history() {
    return this.#history;
  }

  clearHistory() {
    this.#history = [];
  }

  replayFromHistory(index: number) {
    this.#replyIndex = index;
  }
}

test('basic', async () => {
  const fetchProxy = new FetchProxy();
  global.fetch;

  const actor = await createActor({
    fetch: fetchProxy.fetch.bind(fetchProxy),
  });

  fetchProxy.clearHistory();
  const startValue = await actor.read();
  expect(startValue).toBe(0n);
  expect(fetchProxy.history).toHaveLength(1);
});

test('replay queries only', async () => {
  const fetchProxy = new FetchProxy();
  global.fetch;

  const actor = await createActor({
    fetch: fetchProxy.fetch.bind(fetchProxy),
  });

  fetchProxy.clearHistory();
  const startValue = await actor.read();
  expect(startValue).toBe(0n);
  expect(fetchProxy.history).toHaveLength(1);

  fetchProxy.replayFromHistory(0);
  const startValue2 = await actor.read();
  expect(startValue2).toBe(0n);
  expect(fetchProxy.history).toHaveLength(2);
});

test('replay attack', async () => {
  const fetchProxy = new FetchProxy();
  global.fetch;

  const actor = await createActor({
    fetch: fetchProxy.fetch.bind(fetchProxy),
  });

  const agent = Actor.agentOf(actor) as HttpAgent;
  const logFn = vi.fn();
  agent.log.subscribe(logFn);

  fetchProxy.clearHistory();
  const startValue = await actor.read();
  expect(startValue).toBe(0n);
  expect(fetchProxy.history).toHaveLength(1);

  const startValue2 = await actor.read();
  expect(startValue2).toBe(0n);
  expect(fetchProxy.history).toHaveLength(2);

  await actor.inc();

  // wait 1 second
  await new Promise(resolve => setTimeout(resolve, 1000));
  const startValue3 = await actor.read();
  expect(startValue3).toBe(1n);

  fetchProxy.replayFromHistory(1);
  // the replayed request should throw an error
  expect(fetchProxy.history).toHaveLength(6);

  await expect(actor.read()).rejects.toThrowError(
    'Timestamp failed to pass the watermark after retrying the configured 3 times. We cannot guarantee the integrity of the response since it could be a replay attack.',
  );

  // The agent should should have made 4 additional requests (3 retries + 1 original request)
  expect(fetchProxy.history).toHaveLength(10);
}, 10_000);
