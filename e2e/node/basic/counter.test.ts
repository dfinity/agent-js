import { Actor, HttpAgent } from '@dfinity/agent';
import counterCanister, { idl } from '../canisters/counter';
import { it, expect, describe, vi } from 'vitest';

describe('counter', () => {
  it('should greet', async () => {
    const { actor: counter } = await counterCanister();
    try {
      expect(await counter.greet('counter')).toEqual('Hello, counter!');
    } catch (error) {
      console.error(error);
    }
  }, 40000);
  it('should submit distinct requests with nonce by default', async () => {
    const { actor: counter } = await counterCanister();
    const values = await Promise.all(new Array(4).fill(undefined).map(() => counter.inc_read()));
    const set1 = new Set(values);
    const values2 = await Promise.all(new Array(4).fill(undefined).map(() => counter.inc_read()));
    const set2 = new Set(values2);

    // Sets of unique results should be the same length
    expect(set1.size).toBe(values.length);
    expect(set2.size).toEqual(values2.length);
  }, 40000);
  it('should increment', async () => {
    const { actor: counter } = await counterCanister();

    await counter.write(0);
    expect(Number(await counter.read())).toEqual(0);
    let expected = 1;
    for (let i = 0; i < 5; i++) {
      await counter.inc();
      expect(Number(await counter.read())).toEqual(expected);
      expected += 1;
    }
  }, 40000);
});
describe('retrytimes', () => {
  it('should retry after a failure', async () => {
    let count = 0;
    const { canisterId } = await counterCanister();
    const fetchMock = vi.fn(function (...args) {
      count += 1;
      // let the first 3 requests pass, then throw an error on the call
      if (count === 3) {
        return new Response('Test error - ignore', {
          status: 500,
          statusText: 'Internal Server Error',
        });
      }

      // eslint-disable-next-line prefer-spread
      return fetch.apply(null, args as [input: string | Request, init?: RequestInit | undefined]);
    });

    const counter = await Actor.createActor(idl, {
      canisterId,
      agent: await HttpAgent.create({
        fetch: fetchMock as typeof fetch,
        retryTimes: 3,
        host: 'http://localhost:4943',
        shouldFetchRootKey: true,
      }),
    });

    const result = await counter.greet('counter');
    expect(result).toEqual('Hello, counter!');

    // The number of calls should be 4 or more, depending on whether the test environment is using v3 or v2
    if (findV2inCalls(fetchMock.mock.calls as [string, Request][]) === -1) {
      // TODO - pin to 4 once dfx v0.23.0 is released
      expect(fetchMock.mock.calls.length).toBe(4);
    } else {
      expect(fetchMock.mock.calls.length).toBeGreaterThanOrEqual(5);
    }
  }, 40000);
});

const findV2inCalls = (calls: [string, Request][]) => {
  for (let i = 0; i < calls.length; i++) {
    if (calls[i][0].includes('v2')) {
      return i;
    }
  }
  return -1;
};
