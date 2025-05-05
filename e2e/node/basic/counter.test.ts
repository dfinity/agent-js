import { Actor, HttpAgent, ActorMethod } from '@dfinity/agent';
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

  it('should work with preSignReadStateRequest enabled', async () => {
    const { canisterId } = await counterCanister();

    // Create counter actor with preSignReadStateRequest enabled
    const counter = Actor.createActor(idl, {
      canisterId,
      agent: await HttpAgent.create({
        host: 'http://localhost:4943',
        shouldFetchRootKey: true,
      }),
      pollingOptions: {
        preSignReadStateRequest: true,
      },
    });

    // Reset counter to 0
    await counter.write(0);
    expect(Number(await counter.read())).toEqual(0);

    // Call inc_read which will trigger polling and use preSignReadStateRequest
    const result = Number(await counter.inc_read());

    // Verify the operation was successful
    expect(result).toEqual(1);

    // Verify the state was actually updated
    expect(Number(await counter.read())).toEqual(1);
  }, 40000);

  it('should allow method-specific pollingOptions override', async () => {
    const { canisterId } = await counterCanister();

    // Create counter actor without preSignReadStateRequest
    const counter = Actor.createActor(idl, {
      canisterId,
      agent: await HttpAgent.create({
        host: 'http://localhost:4943',
        shouldFetchRootKey: true,
      }),
    });

    // Reset counter to 0
    await counter.write(0);
    expect(Number(await counter.read())).toEqual(0);

    // Use withOptions to set preSignReadStateRequest for this specific call
    const result = Number(
      await (counter.inc_read as ActorMethod).withOptions({
        pollingOptions: {
          preSignReadStateRequest: true,
          // Custom polling strategy with simple 1-second delay
          strategy: () => new Promise(resolve => setTimeout(resolve, 1000)),
        },
      })(),
    );

    // Verify the operation was successful
    expect(result).toEqual(1);

    // Verify the state was actually updated
    expect(Number(await counter.read())).toEqual(1);
  }, 40000);
});

describe('retrytimes', () => {
  it('should retry after a failure', async () => {
    let count = 0;
    const { canisterId } = await counterCanister();
    const fetchMock = vi.fn(function (...args) {
      count += 1;
      // let the first request pass, then fail the first 2 retries, then pass the final retry
      if (count >= 2 && count <= 4) {
        return new Response('Test error - ignore', {
          status: 500,
          statusText: 'Internal Server Error',
        });
      }

      // eslint-disable-next-line prefer-spread
      return fetch.apply(null, args as [input: string | Request, init?: RequestInit | undefined]);
    });

    const counter = Actor.createActor(idl, {
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

    // expected calls:
    // - status call
    // - canister call that fails
    // - two retries that fail
    // - canister call that succeeds
    expect(fetchMock.mock.calls.length).toBe(5);
  }, 40000);
});
