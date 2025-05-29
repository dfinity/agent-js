import { test, expect, vi, describe, afterAll, beforeEach } from 'vitest';
import { createActor } from '../canisters/counter';
import { Actor, HttpAgent } from '@dfinity/agent';
import { getCanisterId } from '../utils/canisterid';

class FetchProxy {
  #history: Response[] = [];
  #calls = 0;
  #replyIndex: number | null = null;

  async fetch(...args: Parameters<typeof global.fetch>): Promise<Response> {
    this.#calls++;
    if (this.#replyIndex !== null) {
      const response = this.#history[this.#replyIndex].clone();
      return response;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await (global.fetch as any)(...args);
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

describe('watermark', async () => {
  const watermark1CanisterId = getCanisterId('watermark1');
  const watermark2CanisterId = getCanisterId('watermark2');
  const watermark3CanisterId = getCanisterId('watermark3');

  const watermark1Actor = await createActor(watermark1CanisterId);
  const watermark2Actor = await createActor(watermark2CanisterId);
  const watermark3Actor = await createActor(watermark3CanisterId);

  beforeEach(async () => {
    // Reset the watermark actors to their initial state before starting tests
    await watermark1Actor.write(0n);
    await watermark2Actor.write(0n);
    await watermark3Actor.write(0n);
  });

  afterAll(async () => {
    // Reset the watermark actors to their initial state
    await watermark1Actor.write(0n);
    await watermark2Actor.write(0n);
    await watermark3Actor.write(0n);
  });

  test('basic', async () => {
    // Reset state for this specific test
    await watermark1Actor.write(0n);

    const fetchProxy = new FetchProxy();

    const actor = await createActor(watermark1CanisterId, {
      agentOptions: {
        fetch: fetchProxy.fetch.bind(fetchProxy),
        verifyQuerySignatures: true,
      },
    });

    fetchProxy.clearHistory();
    const startValue = await actor.read();
    expect(startValue).toBe(0n);
    expect(fetchProxy.calls).toBe(2);
  }, 10_000);

  test('replay queries only', async () => {
    // Reset state for this specific test
    await watermark2Actor.write(0n);

    const fetchProxy = new FetchProxy();

    const actor = await createActor(watermark2CanisterId, {
      agentOptions: {
        fetch: fetchProxy.fetch.bind(fetchProxy),
        verifyQuerySignatures: true,
      },
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
    // Reset state for this specific test
    await watermark3Actor.write(0n);

    const fetchProxy = new FetchProxy();

    const actor = await createActor(watermark3CanisterId, {
      agentOptions: {
        verifyQuerySignatures: true,
        fetch: fetchProxy.fetch.bind(fetchProxy),
        backoffStrategy: () => ({
          next: () => 0,
        }),
      },
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
    // await new Promise(resolve => setTimeout(resolve, 1000));
    const startValue3 = await actor.read();
    expect(startValue3).toBe(1n);

    const queryResponseIndex = indexOfQueryResponse(fetchProxy.history);
    console.log(queryResponseIndex);

    fetchProxy.replayFromHistory(queryResponseIndex);

    // The number of calls should be 4 or more, depending on whether the test environment is using v3 or v2
    const usingV2 =
      findV2inCalls(
        fetchProxy.history.map(response => {
          return [response.url];
        }),
      ) !== -1;
    if (usingV2) {
      // TODO - pin to 5 once dfx v0.23.0 is released
      // the replayed request should throw an error
      expect(fetchProxy.calls).toBe(5);
    } else {
      expect(fetchProxy.calls).toBeGreaterThanOrEqual(5);
    }

    await expect(actor.read()).rejects.toThrowError(
      'Timestamp failed to pass the watermark after retrying the configured 3 times. We cannot guarantee the integrity of the response since it could be a replay attack.',
    );

    // TODO - pin to 9 once dfx v0.23.0 is released
    if (usingV2) {
      // the replayed request should throw an error
      // The agent should should have made 4 additional requests (3 retries + 1 original request)
      expect(fetchProxy.calls).toBe(9);
    } else {
      expect(fetchProxy.calls).toBeGreaterThanOrEqual(9);
    }
  }, 10_000);

  const findV2inCalls = (calls: [string][]) => {
    for (let i = 0; i < calls.length; i++) {
      if (calls[i][0].includes('v2')) {
        return i;
      }
    }
    return -1;
  };
});
