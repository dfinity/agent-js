import { test, expect, vi } from 'vitest';
import { createActor } from '../canisters/counter';
import { Actor, HttpAgent } from '@dfinity/agent';

class FetchProxy {
  #history: Response[] = [];
  #calls = 0;
  #replyIndex: number | null = null;

  async fetch(...args): Promise<Response> {
    this.#calls++;
    if (this.#replyIndex !== null) {
      const response = this.#history[this.#replyIndex].clone();
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

  get calls() {
    return this.#calls;
  }

  clearHistory() {
    this.#history = [];
    this.#calls = 0;
    this.#replyIndex = null;
  }

  replayFromHistory(index: number) {
    this.#replyIndex = index;
  }
}

function indexOfQueryResponse(history: Response[]) {
  return history.findIndex(response => response.url.endsWith('query'));
}

test('basic', async () => {
  const fetchProxy = new FetchProxy();
  global.fetch;

  const actor = await createActor({
    fetch: fetchProxy.fetch.bind(fetchProxy),
    verifyQuerySignatures: true,
  });

  fetchProxy.clearHistory();
  const startValue = await actor.read();
  expect(startValue).toBe(0n);
  expect(fetchProxy.calls).toBe(2);
}, 10_000);

test('replay queries only', async () => {
  const fetchProxy = new FetchProxy();
  global.fetch;

  const actor = await createActor({
    fetch: fetchProxy.fetch.bind(fetchProxy),
    verifyQuerySignatures: true,
  });

  fetchProxy.clearHistory();
  const startValue = await actor.read();
  expect(startValue).toBe(0n);
  expect(fetchProxy.calls).toBe(2);

  const queryResponseIndex = indexOfQueryResponse(fetchProxy.history);

  fetchProxy.replayFromHistory(queryResponseIndex);

  const startValue2 = await actor.read();
  expect(startValue2).toBe(0n);
  expect(fetchProxy.calls).toBe(3);
}, 10_000);

test('replay attack', async () => {
  vi.useRealTimers();
  const fetchProxy = new FetchProxy();
  global.fetch;

  const actor = await createActor({
    verifyQuerySignatures: true,
    fetch: fetchProxy.fetch.bind(fetchProxy),
    retryTimes: 3,
  });

  const agent = Actor.agentOf(actor) as HttpAgent;
  const logFn = vi.fn();
  agent.log.subscribe(logFn);

  fetchProxy.clearHistory();
  const startValue = await actor.read();
  expect(startValue).toBe(0n);

  // 1: make query
  // 2: fetch subnet keys
  expect(fetchProxy.calls).toBe(2);

  const startValue2 = await actor.read();
  expect(startValue2).toBe(0n);
  expect(fetchProxy.calls).toBe(3);

  await actor.inc();

  // wait 1 second
  await new Promise(resolve => setTimeout(resolve, 1000));
  const startValue3 = await actor.read();
  expect(startValue3).toBe(1n);

  const queryResponseIndex = indexOfQueryResponse(fetchProxy.history);

  fetchProxy.replayFromHistory(queryResponseIndex);

  // the replayed request should throw an error
  expect(fetchProxy.calls).toBe(7);

  await expect(actor.read()).rejects.toThrowError(
    'Timestamp failed to pass the watermark after retrying the configured 3 times. We cannot guarantee the integrity of the response since it could be a replay attack.',
  );

  // The agent should should have made 4 additional requests (3 retries + 1 original request)
  expect(fetchProxy.calls).toBe(11);
}, 10_000);
