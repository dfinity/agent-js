import { test, expect, vi } from 'vitest';
import { createActor } from '../canisters/counter';
import { Actor, HttpAgent } from '@dfinity/agent';
import { Agent } from 'http';

class FetchProxy {
  #history: Response[] = [];
  #replyIndex = 0;

  async fetch(...args): Promise<Response> {
    if (this.#replyIndex) {
      return this.#history[this.#replyIndex].clone();
    }

    const response = await global.fetch(...args);
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

  await expect(actor.read()).rejects.toThrow();

  // The agent should have made 3 additional requests
  expect(fetchProxy.history).toHaveLength(9);
}, 10_000);
