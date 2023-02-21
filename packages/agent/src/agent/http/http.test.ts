/* eslint-disable @typescript-eslint/no-explicit-any */
import { HttpAgent, Nonce } from '../index';
import * as cbor from '../../cbor';
import { Expiry, makeNonceTransform } from './transforms';
import {
  CallRequest,
  Envelope,
  HttpAgentRequestTransformFn,
  makeNonce,
  SubmitRequestType,
} from './types';
import { Principal } from '@dfinity/principal';
import { requestIdOf } from '../../request_id';

import { JSDOM } from 'jsdom';
import { AnonymousIdentity, SignIdentity } from '../..';
import { Ed25519KeyIdentity } from '../../../../identity/src/identity/ed25519';
import { toHexString } from '../../../../identity/src/buffer';
import { AgentError } from '../../errors';
import fetch from 'isomorphic-fetch';
const { window } = new JSDOM(`<!DOCTYPE html><p>Hello world</p>`);
window.fetch = global.fetch;
(global as any).window = window;

const HTTP_AGENT_HOST = 'http://localhost:4943';

const DEFAULT_INGRESS_EXPIRY_DELTA_IN_MSECS = 5 * 60 * 1000;
const REPLICA_PERMITTED_DRIFT_MILLISECONDS = 60 * 1000;
const NANOSECONDS_PER_MILLISECONDS = 1_000_000;

function createIdentity(seed: number): Ed25519KeyIdentity {
  const seed1 = new Array(32).fill(0);
  seed1[0] = seed;
  return Ed25519KeyIdentity.generate(new Uint8Array(seed1));
}

const originalDateNowFn = global.Date.now;
const originalWindow = global.window;
const originalFetch = global.fetch;
beforeEach(() => {
  global.Date.now = jest.fn(() => new Date(NANOSECONDS_PER_MILLISECONDS).getTime());
  global.window = originalWindow;
  global.fetch = originalFetch;
});

afterEach(() => {
  global.Date.now = originalDateNowFn;
  global.window = originalWindow;
  global.fetch = originalFetch;
  jest.spyOn(console, 'warn').mockImplementation(() => {
    /** suppress warnings for pending timers */
  });
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});

test('call', async () => {
  const mockFetch: jest.Mock = jest.fn((resource, init) => {
    return Promise.resolve(
      new Response(null, {
        status: 200,
      }),
    );
  });

  const canisterId: Principal = Principal.fromText('2chl6-4hpzw-vqaaa-aaaaa-c');
  const nonce = new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7]) as Nonce;
  const principal = Principal.anonymous();

  const httpAgent = new HttpAgent({ fetch: mockFetch, host: 'http://localhost' });

  const methodName = 'greet';
  const arg = new Uint8Array([]);

  const { requestId } = await httpAgent.call(canisterId, {
    methodName,
    arg,
  });

  const mockPartialRequest = {
    request_type: SubmitRequestType.Call,
    canister_id: canisterId,
    method_name: methodName,
    // We need a request id for the signature and at the same time we
    // are checking that signature does not impact the request id.
    arg,
    nonce,
    sender: principal,
    ingress_expiry: new Expiry(300000),
  };

  const mockPartialsRequestId = await requestIdOf(mockPartialRequest);

  const expectedRequest = {
    content: mockPartialRequest,
  };

  const expectedRequestId = await requestIdOf(expectedRequest.content);
  expect(expectedRequestId).toEqual(mockPartialsRequestId);

  const { calls, results } = mockFetch.mock;
  expect(calls.length).toBe(1);
  expect(requestId).toEqual(expectedRequestId);
  const call1 = calls[0][0];
  const call2 = calls[0][1];
  expect(call1).toBe(`http://localhost/api/v2/canister/${canisterId.toText()}/call`);
  expect(call2.method).toEqual('POST');
  expect(call2.body).toEqual(cbor.encode(expectedRequest));
  expect(call2.headers.get('Content-Type')).toEqual('application/cbor');
});

test.todo('query');

test('queries with the same content should have the same signature', async () => {
  const mockResponse = {
    status: 'replied',
    reply: { arg: new Uint8Array([]) },
  };

  const mockFetch: jest.Mock = jest.fn((resource, init) => {
    const body = cbor.encode(mockResponse);
    return Promise.resolve(
      new Response(body, {
        status: 200,
      }),
    );
  });

  const canisterIdent = '2chl6-4hpzw-vqaaa-aaaaa-c';
  const nonce = new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7]) as Nonce;

  const principal = await Principal.anonymous();

  const httpAgent = new HttpAgent({
    fetch: mockFetch,
    host: 'http://localhost',
    disableNonce: true,
  });
  httpAgent.addTransform(makeNonceTransform(() => nonce));

  const methodName = 'greet';
  const arg = new Uint8Array([]);

  const requestId = await requestIdOf({
    request_type: SubmitRequestType.Call,
    nonce,
    canister_id: Principal.fromText(canisterIdent).toString(),
    method_name: methodName,
    arg,
    sender: principal,
  });

  const paths = [
    [new TextEncoder().encode('request_status'), requestId, new TextEncoder().encode('reply')],
  ];

  const response1 = await httpAgent.readState(canisterIdent, { paths });
  const response2 = await httpAgent.readState(canisterIdent, { paths });

  const response3 = await httpAgent.query(canisterIdent, { arg, methodName });
  const response4 = await httpAgent.query(canisterIdent, { methodName, arg });

  const { calls } = mockFetch.mock;
  expect(calls.length).toBe(4);

  expect(calls[0]).toEqual(calls[1]);
  expect(response1).toEqual(response2);

  expect(calls[2]).toEqual(calls[3]);
  expect(response3).toEqual(response4);
});

test('readState should not call transformers if request is passed', async () => {
  const mockResponse = {
    status: 'replied',
    reply: { arg: new Uint8Array([]) },
  };

  const mockFetch: jest.Mock = jest.fn((resource, init) => {
    const body = cbor.encode(mockResponse);
    return Promise.resolve(
      new Response(body, {
        status: 200,
      }),
    );
  });

  const canisterIdent = '2chl6-4hpzw-vqaaa-aaaaa-c';
  const nonce = new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7]) as Nonce;

  const principal = await Principal.anonymous();

  const httpAgent = new HttpAgent({
    fetch: mockFetch,
    host: 'http://localhost',
    disableNonce: true,
  });
  httpAgent.addTransform(makeNonceTransform(() => nonce));
  const transformMock: HttpAgentRequestTransformFn = jest
    .fn()
    .mockImplementation(d => Promise.resolve(d));
  httpAgent.addTransform(transformMock);

  const methodName = 'greet';
  const arg = new Uint8Array([]);

  const requestId = await requestIdOf({
    request_type: SubmitRequestType.Call,
    nonce,
    canister_id: Principal.fromText(canisterIdent).toString(),
    method_name: methodName,
    arg,
    sender: principal,
  });

  const paths = [
    [new TextEncoder().encode('request_status'), requestId, new TextEncoder().encode('reply')],
  ];

  const request = await httpAgent.createReadStateRequest({ paths });
  expect(transformMock).toBeCalledTimes(1);
  await httpAgent.readState(canisterIdent, { paths }, undefined, request);
  expect(transformMock).toBeCalledTimes(1);
});

test('redirect avoid', async () => {
  function checkUrl(base: string, result: string) {
    const httpAgent = new HttpAgent({ host: base });
    expect(httpAgent['_host'].hostname).toBe(result);
  }

  checkUrl('https://ic0.app', 'ic0.app');
  checkUrl('https://IC0.app', 'ic0.app');
  checkUrl('https://foo.ic0.app', 'ic0.app');
  checkUrl('https://foo.IC0.app', 'ic0.app');
  checkUrl('https://foo.Ic0.app', 'ic0.app');
  checkUrl('https://foo.iC0.app', 'ic0.app');
  checkUrl('https://foo.bar.ic0.app', 'ic0.app');
  checkUrl('https://ic0.app/foo/', 'ic0.app');
  checkUrl('https://foo.ic0.app/foo/', 'ic0.app');

  // icp-api.io
  checkUrl('https://icp-api.io', 'icp-api.io');
  checkUrl('https://ICP-API.io', 'icp-api.io');
  checkUrl('https://foo.icp-api.io', 'icp-api.io');
  checkUrl('https://foo.ICP-API.io', 'icp-api.io');
  checkUrl('https://foo.Icp-api.io', 'icp-api.io');
  checkUrl('https://foo.bar.icp-api.io', 'icp-api.io');
  checkUrl('https://icp-api.io/foo/', 'icp-api.io');
  checkUrl('https://foo.icp-api.io/foo/', 'icp-api.io');

  // icp-api.io
  checkUrl('https://icp0.io', 'icp0.io');
  checkUrl('https://ICP0.io', 'icp0.io');
  checkUrl('https://foo.icp0.io', 'icp0.io');
  checkUrl('https://foo.ICP0.io', 'icp0.io');
  checkUrl('https://foo.Icp0.io', 'icp0.io');
  checkUrl('https://foo.bar.icp0.io', 'icp0.io');
  checkUrl('https://icp0.io/foo/', 'icp0.io');
  checkUrl('https://foo.icp0.io/foo/', 'icp0.io');

  checkUrl('https://ic1.app', 'ic1.app');
  checkUrl('https://foo.ic1.app', 'foo.ic1.app');
  checkUrl('https://ic0.app.ic1.app', 'ic0.app.ic1.app');

  checkUrl('https://fooic0.app', 'fooic0.app');
  checkUrl('https://fooic0.app.ic0.app', 'ic0.app');
});

test('use anonymous principal if unspecified', async () => {
  const mockFetch: jest.Mock = jest.fn((resource, init) => {
    return Promise.resolve(
      new Response(new Uint8Array([]), {
        status: 200,
      }),
    );
  });

  const canisterId: Principal = Principal.fromText('2chl6-4hpzw-vqaaa-aaaaa-c');
  const nonce = new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7]) as Nonce;
  const principal = Principal.anonymous();

  const httpAgent = new HttpAgent({
    fetch: mockFetch,
    host: 'http://localhost',
    disableNonce: true,
  });
  httpAgent.addTransform(makeNonceTransform(() => nonce));

  const methodName = 'greet';
  const arg = new Uint8Array([]);

  const { requestId } = await httpAgent.call(canisterId, {
    methodName,
    arg,
  });

  const mockPartialRequest: CallRequest = {
    request_type: SubmitRequestType.Call,
    canister_id: canisterId,
    method_name: methodName,
    // We need a request id for the signature and at the same time we
    // are checking that signature does not impact the request id.
    arg,
    nonce,
    sender: principal,
    ingress_expiry: new Expiry(300000),
  };

  const mockPartialsRequestId = await requestIdOf(mockPartialRequest);

  const expectedRequest: Envelope<CallRequest> = {
    content: mockPartialRequest,
  };

  const expectedRequestId = await requestIdOf(expectedRequest.content);
  expect(expectedRequestId).toEqual(mockPartialsRequestId);

  const { calls, results } = mockFetch.mock;
  expect(calls.length).toBe(1);
  expect(requestId).toEqual(expectedRequestId);

  expect(calls[0][0]).toBe(`http://localhost/api/v2/canister/${canisterId.toText()}/call`);
  const call2 = calls[0][1];
  expect(call2.method).toEqual('POST');
  expect(call2.body).toEqual(cbor.encode(expectedRequest));
  expect(call2.headers.get('Content-Type')).toEqual('application/cbor');
});

describe('getDefaultFetch', () => {
  it("should use fetch from window if it's available", async () => {
    const generateAgent = () => new HttpAgent({ host: HTTP_AGENT_HOST });
    expect(generateAgent).not.toThrowError();
  });
  it('should throw an error if fetch is not available on the window object', async () => {
    delete (window as any).fetch;
    const generateAgent = () => new HttpAgent({ host: HTTP_AGENT_HOST });

    expect(generateAgent).toThrowError('Fetch implementation was not available');
  });
  it('should throw error for defaultFetch with no window or global fetch', () => {
    delete (global as any).window;
    delete (global as any).fetch;
    const generateAgent = () => new HttpAgent({ host: HTTP_AGENT_HOST });

    expect(generateAgent).toThrowError('Fetch implementation was not available');
  });
  it('should fall back to global.fetch if window is not available', () => {
    delete (global as any).window;
    global.fetch = originalFetch;
    const generateAgent = () => new HttpAgent({ host: HTTP_AGENT_HOST });

    expect(generateAgent).not.toThrowError();
  });
  it.skip('should throw an error if window, global, and fetch are not available', () => {
    // TODO: Figure out how to test the self and default case errors
  });
});

describe('invalidate identity', () => {
  const mockFetch: jest.Mock = jest.fn();
  it('should allow its identity to be invalidated', () => {
    const identity = new AnonymousIdentity();
    const agent = new HttpAgent({ identity, fetch: mockFetch, host: 'http://localhost' });
    const invalidate = () => agent.invalidateIdentity();
    expect(invalidate).not.toThrowError();
  });
  it('should throw an error instead of making a call if its identity is invalidated', async () => {
    const canisterId: Principal = Principal.fromText('2chl6-4hpzw-vqaaa-aaaaa-c');
    const identity = new AnonymousIdentity();
    const agent = new HttpAgent({ identity, fetch: mockFetch, host: 'http://localhost' });
    agent.invalidateIdentity();

    const expectedError =
      "This identity has expired due this application's security policy. Please refresh your authentication.";

    // Test Agent.call
    try {
      await agent.call(canisterId, {
        methodName: 'test',
        arg: new ArrayBuffer(16),
      });
    } catch (error) {
      expect(error.message).toBe(expectedError);
    }
    // Test Agent.query
    try {
      await agent.query(canisterId, {
        methodName: 'test',
        arg: new ArrayBuffer(16),
      });
    } catch (error) {
      expect(error.message).toBe(expectedError);
    }
    // Test readState
    try {
      await agent.readState(canisterId, {
        paths: [[new ArrayBuffer(16)]],
      });
    } catch (error) {
      expect(error.message).toBe(expectedError);
    }
  });
});
describe('replace identity', () => {
  const mockFetch: jest.Mock = jest.fn();
  it('should allow an actor to replace its identity', () => {
    const identity = new AnonymousIdentity();
    const agent = new HttpAgent({ identity, fetch: mockFetch, host: 'http://localhost' });

    const identity2 = new AnonymousIdentity();
    const replace = () => agent.replaceIdentity(identity2);
    expect(replace).not.toThrowError();
  });
  it('should use the new identity in calls', async () => {
    const mockFetch: jest.Mock = jest.fn((resource, init) => {
      return Promise.resolve(
        new Response(null, {
          status: 200,
        }),
      );
    });
    const expectedError =
      "This identity has expired due this application's security policy. Please refresh your authentication.";

    const canisterId: Principal = Principal.fromText('2chl6-4hpzw-vqaaa-aaaaa-c');
    const identity = new AnonymousIdentity();
    const agent = new HttpAgent({ identity, fetch: mockFetch, host: 'http://localhost' });
    // First invalidate identity
    agent.invalidateIdentity();
    await agent
      .query(canisterId, {
        methodName: 'test',
        arg: new ArrayBuffer(16),
      })
      .catch((reason: AgentError) => {
        // This should fail
        expect(reason.message).toBe(expectedError);
      });

    // Then, add new identity
    const identity2 = createIdentity(0) as unknown as SignIdentity;
    agent.replaceIdentity(identity2);
    await agent.call(canisterId, {
      methodName: 'test',
      arg: new ArrayBuffer(16),
    });
    expect(mockFetch).toBeCalledTimes(1);
  });
});

describe('makeNonce', () => {
  it('should create unique values', () => {
    const nonces = new Set();
    for (let i = 0; i < 100; i++) {
      nonces.add(toHexString(makeNonce()));
    }
    expect(nonces.size).toBe(100);
  });

  describe('setBigUint64 polyfill', () => {
    const DataViewConstructor = DataView;
    let spyOnSetUint32: jest.SpyInstance;
    let usePolyfill = false;

    beforeAll(() => {
      jest.spyOn(Math, 'random').mockImplementation(() => 0.5);
      jest.spyOn(globalThis, 'DataView').mockImplementation(buffer => {
        const view: DataView = new DataViewConstructor(buffer);
        (view.setBigUint64 as any) = usePolyfill ? undefined : view.setBigUint64;
        spyOnSetUint32 = jest.spyOn(view, 'setUint32');
        return view;
      });
    });

    afterAll(() => {
      jest.clearAllMocks();
      jest.restoreAllMocks();
    });

    it('should create same value using polyfill', () => {
      const originalNonce = toHexString(makeNonce());
      expect(spyOnSetUint32).toBeCalledTimes(2);

      usePolyfill = true;

      const nonce = toHexString(makeNonce());
      expect(spyOnSetUint32).toBeCalledTimes(4);

      expect(nonce).toBe(originalNonce);
    });
    it.skip('should insert the nonce as a header in the request', async () => {
      const mockFetch: jest.Mock = jest.fn((resource, init) => {
        return Promise.resolve(
          new Response(null, {
            status: 200,
          }),
        );
      });
      const agent = new HttpAgent({ host: HTTP_AGENT_HOST, fetch: mockFetch });
      const canisterId: Principal = Principal.fromText('2chl6-4hpzw-vqaaa-aaaaa-c');
      await agent.call(canisterId, {
        methodName: 'test',
        arg: new ArrayBuffer(16),
      });

      expect(mockFetch).toBeCalledTimes(1);
      const request = mockFetch.mock.calls[0][1];
      expect(request.headers.get?.('X-IC-Request-ID')).toBeDefined();

      const nonce = request.headers.get('X-IC-Request-ID');
      expect(nonce).toBeDefined();
      expect(nonce).toHaveLength(32);
    });
  });
});
describe('retry failures', () => {
  let consoleSpy;
  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();
    if (typeof consoleSpy === 'function') {
      consoleSpy.mockRestore();
    }
  });

  it('should throw errors immediately if retryTimes is set to 0', () => {
    const mockFetch: jest.Mock = jest.fn();

    mockFetch.mockReturnValueOnce(
      new Response('Error', {
        status: 500,
        statusText: 'Internal Server Error',
      }),
    );
    const agent = new HttpAgent({ host: HTTP_AGENT_HOST, fetch: mockFetch, retryTimes: 0 });
    expect(
      agent.call(Principal.managementCanister(), {
        methodName: 'test',
        arg: new Uint8Array().buffer,
      }),
    ).rejects.toThrowErrorMatchingSnapshot();
  });
  it('should throw errors after 3 retries by default', async () => {
    const mockFetch: jest.Mock = jest.fn(() => {
      return new Response('Error', {
        status: 500,
        statusText: 'Internal Server Error',
      });
    });

    const agent = new HttpAgent({ host: HTTP_AGENT_HOST, fetch: mockFetch });
    try {
      expect(
        agent.call(Principal.managementCanister(), {
          methodName: 'test',
          arg: new Uint8Array().buffer,
        }),
      ).rejects.toThrow();
    } catch (error) {
      // One try + three retries
      expect(mockFetch.mock.calls.length).toBe(4);
    }
  });
  it('should succeed after multiple failures within the configured limit', async () => {
    let calls = 0;
    const mockFetch: jest.Mock = jest.fn(() => {
      if (calls === 3) {
        return new Response('test', {
          status: 200,
          statusText: 'success!',
        });
      } else {
        calls += 1;
        return new Response('Error', {
          status: 500,
          statusText: 'Internal Server Error',
        });
      }
    });

    const agent = new HttpAgent({ host: HTTP_AGENT_HOST, fetch: mockFetch });
    const result = await agent.call(Principal.managementCanister(), {
      methodName: 'test',
      arg: new Uint8Array().buffer,
    });
    expect(result).toMatchSnapshot();
    // One try + three retries
    expect(mockFetch.mock.calls.length).toBe(4);
  });
});
jest.useFakeTimers({ legacyFakeTimers: true });
test('should change nothing if time is within 30 seconds of replica', async () => {
  const systemTime = new Date('August 19, 1975 23:15:30');
  // jest.setSystemTime(systemTime);
  const mockFetch = jest.fn();

  const agent = new HttpAgent({ host: HTTP_AGENT_HOST, fetch: mockFetch });

  await agent.syncTime();

  agent
    .call(Principal.managementCanister(), {
      methodName: 'test',
      arg: new Uint8Array().buffer,
    })
    // eslint-disable-next-line @typescript-eslint/no-empty-function, @typescript-eslint/no-unused-vars
    .catch(function (_) {});

  const requestBody = cbor.decode(mockFetch.mock.calls[0][1].body);
  expect((requestBody as unknown as any).content.ingress_expiry).toMatchInlineSnapshot(
    `1240000000000`,
  );
});
test('should adjust the Expiry if the clock is more than 30 seconds behind', async () => {
  const mockFetch = jest.fn();

  const replicaTime = new Date(Date.now() + 31_000);
  jest.mock('../../canisterStatus', () => {
    return {
      request: () => {
        return {
          // 31 seconds ahead
          get: () => replicaTime,
        };
      },
    };
  });
  await import('../../canisterStatus');
  const { HttpAgent } = await import('../index');

  const agent = new HttpAgent({ host: HTTP_AGENT_HOST, fetch: mockFetch });

  await agent.syncTime();

  await agent
    .call(Principal.managementCanister(), {
      methodName: 'test',
      arg: new Uint8Array().buffer,
    })
    // eslint-disable-next-line @typescript-eslint/no-empty-function, @typescript-eslint/no-unused-vars
    .catch(function (_) {});

  const requestBody: any = cbor.decode(mockFetch.mock.calls[0][1].body);

  // Expiry should be: ingress expiry + replica time
  const expiryInMs = requestBody.content.ingress_expiry / NANOSECONDS_PER_MILLISECONDS;

  const delay = expiryInMs + REPLICA_PERMITTED_DRIFT_MILLISECONDS - Number(replicaTime);

  expect(requestBody.content.ingress_expiry).toMatchInlineSnapshot(`1271000000000`);

  expect(delay).toBe(DEFAULT_INGRESS_EXPIRY_DELTA_IN_MSECS);
  jest.resetModules();
});

// TODO - fix broken test
test('should adjust the Expiry if the clock is more than 30 seconds ahead', async () => {
  const mockFetch = jest.fn();

  const replicaTime = new Date(Date.now() - 31_000);
  jest.mock('../../canisterStatus', () => {
    return {
      request: () => {
        return {
          // 31 seconds behind
          get: () => replicaTime,
        };
      },
    };
  });
  await import('../../canisterStatus');
  const { HttpAgent } = await import('../index');

  const agent = new HttpAgent({ host: HTTP_AGENT_HOST, fetch: mockFetch });

  await agent.syncTime();

  await agent
    .call(Principal.managementCanister(), {
      methodName: 'test',
      arg: new Uint8Array().buffer,
    })
    // eslint-disable-next-line @typescript-eslint/no-empty-function, @typescript-eslint/no-unused-vars
    .catch(function (_) {});

  const requestBody: any = cbor.decode(mockFetch.mock.calls[0][1].body);

  // Expiry should be: replica time - ingress expiry
  const expiryInMs = requestBody.content.ingress_expiry / NANOSECONDS_PER_MILLISECONDS;

  const delay = Number(replicaTime) - (expiryInMs + REPLICA_PERMITTED_DRIFT_MILLISECONDS);

  expect(requestBody.content.ingress_expiry).toMatchInlineSnapshot(`1209000000000`);

  expect(delay).toBe(-1 * DEFAULT_INGRESS_EXPIRY_DELTA_IN_MSECS);
  jest.resetModules();
});

test('should fetch with given call options and fetch options', async () => {
  const mockFetch: jest.Mock = jest.fn(() => {
    const body = cbor.encode({});
    return Promise.resolve(
      new Response(body, {
        status: 200,
      }),
    );
  });

  const canisterId: Principal = Principal.fromText('2chl6-4hpzw-vqaaa-aaaaa-c');
  const httpAgent = new HttpAgent({
    fetch: mockFetch,
    host: 'http://localhost',
    callOptions: {
      reactNative: { textStreaming: true },
    },
    fetchOptions: {
      reactNative: {
        __nativeResponseType: 'base64',
      },
    },
  });

  await httpAgent.call(canisterId, {
    methodName: 'greet',
    arg: new Uint8Array([]),
  });

  await httpAgent.query(canisterId, {
    methodName: 'greet',
    arg: new Uint8Array([]),
  });

  const { calls } = mockFetch.mock;

  expect(calls[0][1].reactNative).toStrictEqual({ textStreaming: true });
  expect(calls[1][1].reactNative.__nativeResponseType).toBe('base64');
});
