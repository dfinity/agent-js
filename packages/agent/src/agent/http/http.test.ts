/* eslint-disable @typescript-eslint/no-explicit-any */
import { HttpAgent, Nonce } from '../index';
import * as cbor from '../../cbor';
import { Expiry, httpHeadersTransform } from './transforms';
import {
  CallRequest,
  Envelope,
  HttpAgentRequestTransformFn,
  makeNonce,
  SubmitRequestType,
} from './types';
import { Principal } from '@dfinity/principal';
import { RequestId, requestIdOf } from '../../request_id';

import { JSDOM } from 'jsdom';
import {
  Actor,
  AnonymousIdentity,
  fromHex,
  getManagementCanister,
  type ManagementCanisterRecord,
  type ActorSubclass,
  SignIdentity,
  toHex,
  Signature,
} from '../..';
import { Ed25519KeyIdentity } from '@dfinity/identity';
import {
  AgentError,
  HttpErrorCode,
  HttpFetchErrorCode,
  IdentityInvalidErrorCode,
} from '../../errors';
import { bufFromBufLike } from '@dfinity/candid';
import { utf8ToBytes } from '@noble/hashes/utils';

const { window } = new JSDOM(`<!DOCTYPE html><p>Hello world</p>`);
window.fetch = global.fetch;
(global as any).window = window;

const HTTP_AGENT_HOST = 'http://127.0.0.1:4943';

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
  Object.assign(global, 'window', {
    value: {
      originalWindow,
    },
    writable: true,
  });
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
  const mockFetch: jest.Mock = jest.fn(() => {
    return Promise.resolve(
      new Response(null, {
        status: 200,
      }),
    );
  });

  const canisterId: Principal = Principal.fromText('2chl6-4hpzw-vqaaa-aaaaa-c');
  const nonce = new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7]) as Nonce;
  const principal = Principal.anonymous();

  const httpAgent = new HttpAgent({ fetch: mockFetch, host: 'http://127.0.0.1' });

  const methodName = 'greet';
  const arg = bufFromBufLike(new Uint8Array([]));

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

  const mockPartialsRequestId = requestIdOf(mockPartialRequest);

  const expectedRequest = {
    content: mockPartialRequest,
  };

  const expectedRequestId = requestIdOf(expectedRequest.content);
  expect(expectedRequestId).toEqual(mockPartialsRequestId);

  const { calls } = mockFetch.mock;
  expect(calls.length).toBe(1);
  expect(requestId).toEqual(expectedRequestId);
  const call1 = calls[0][0];
  const call2 = calls[0][1];
  expect(call1).toBe(`http://127.0.0.1/api/v3/canister/${canisterId.toText()}/call`);
  expect(call2.method).toEqual('POST');
  expect(call2.body).toEqual(cbor.encode(expectedRequest));
  expect(call2.headers['Content-Type']).toEqual('application/cbor');
});

test.todo('query');

test('queries with the same content should have the same signature', async () => {
  const mockResponse = {
    status: 'replied',
    reply: { arg: new Uint8Array([]) },
  };

  const mockFetch: jest.Mock = jest.fn(() => {
    const body = cbor.encode(mockResponse);
    return Promise.resolve(
      new Response(body, {
        status: 200,
      }),
    );
  });

  const canisterId = '2chl6-4hpzw-vqaaa-aaaaa-c';
  const nonce = new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7]) as Nonce;

  const principal = await Principal.anonymous();

  const httpAgent = new HttpAgent({
    fetch: mockFetch,
    host: 'http://127.0.0.1',
    verifyQuerySignatures: false,
  });

  const methodName = 'greet';
  const arg = bufFromBufLike(new Uint8Array([]));

  const requestId = requestIdOf({
    request_type: SubmitRequestType.Call,
    nonce,
    canister_id: Principal.fromText(canisterId).toString(),
    method_name: methodName,
    arg,
    sender: principal,
  });

  const paths = [
    [
      bufFromBufLike(utf8ToBytes('request_status')),
      requestId,
      bufFromBufLike(utf8ToBytes('reply')),
    ],
  ];

  const response1 = await httpAgent.readState(canisterId, { paths });
  const response2 = await httpAgent.readState(canisterId, { paths });

  const response3 = await httpAgent.query(canisterId, { arg, methodName });
  const response4 = await httpAgent.query(canisterId, { methodName, arg });

  const { calls } = mockFetch.mock;
  expect(calls.length).toBe(4);

  expect(calls[0]).toEqual(calls[1]);
  expect(response1).toEqual(response2);

  // TODO - investigate why these are not equal
  // expect(calls[2]).toEqual(calls[3]);
  expect(response3).toEqual(response4);
});

test('readState should not call transformers if request is passed', async () => {
  const mockResponse = {
    status: 'replied',
    reply: { arg: new Uint8Array([]) },
  };

  const mockFetch: jest.Mock = jest.fn(() => {
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
    host: 'http://127.0.0.1',
    useQueryNonces: true,
  });
  const transformMock: HttpAgentRequestTransformFn = jest
    .fn()
    .mockImplementation(d => Promise.resolve(d));
  httpAgent.addTransform('query', transformMock);

  const methodName = 'greet';
  const arg = new Uint8Array([]);

  const requestId = requestIdOf({
    request_type: SubmitRequestType.Call,
    nonce,
    canister_id: Principal.fromText(canisterIdent).toString(),
    method_name: methodName,
    arg,
    sender: principal,
  });

  const paths = [
    [
      bufFromBufLike(utf8ToBytes('request_status')),
      requestId,
      bufFromBufLike(utf8ToBytes('reply')),
    ],
  ];

  const request = await httpAgent.createReadStateRequest({ paths });
  expect(transformMock).toBeCalledTimes(1);
  await httpAgent.readState(canisterIdent, { paths }, undefined, request);
  expect(transformMock).toBeCalledTimes(1);
});

test('use provided nonce for call', async () => {
  const mockFetch: jest.Mock = jest.fn(() => {
    return Promise.resolve(
      new Response(null, {
        status: 200,
      }),
    );
  });

  const canisterId: Principal = Principal.fromText('2chl6-4hpzw-vqaaa-aaaaa-c');
  const nonce = new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7]) as Nonce;

  const httpAgent = new HttpAgent({ fetch: mockFetch, host: 'http://localhost' });

  const methodName = 'greet';
  const arg = new ArrayBuffer(32);

  const callResponse = await httpAgent.call(canisterId, {
    methodName,
    arg,
    nonce,
  });

  expect(callResponse?.requestDetails?.nonce).toEqual(nonce);
});

test('redirect avoid', async () => {
  function checkUrl(base: string, result: string) {
    const httpAgent = new HttpAgent({ host: base });
    expect(httpAgent.host.hostname).toBe(result);
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
  const mockFetch: jest.Mock = jest.fn(() => {
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
    host: 'http://127.0.0.1',
  });

  const methodName = 'greet';
  const arg = bufFromBufLike(new Uint8Array([]));

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

  const mockPartialsRequestId = requestIdOf(mockPartialRequest);

  const expectedRequest: Envelope<CallRequest> = {
    content: mockPartialRequest,
  };

  const expectedRequestId = requestIdOf(expectedRequest.content);
  expect(expectedRequestId).toEqual(mockPartialsRequestId);

  const { calls } = mockFetch.mock;
  expect(calls.length).toBe(1);
  expect(requestId).toEqual(expectedRequestId);

  expect(calls[0][0]).toBe(`http://127.0.0.1/api/v3/canister/${canisterId.toText()}/call`);
  const call2 = calls[0][1];
  expect(call2.method).toEqual('POST');
  expect(call2.body).toEqual(cbor.encode(expectedRequest));
  expect(call2.headers['Content-Type']).toEqual('application/cbor');
});

describe('transforms', () => {
  it('should map from fetch Headers to HttpFieldHeader', async () => {
    const headers = new Headers([]);
    headers.set('content-type', 'text/plain');

    expect(httpHeadersTransform(headers)).toEqual([['content-type', 'text/plain']]);
  });
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
    const agent = new HttpAgent({ identity, fetch: mockFetch, host: 'http://127.0.0.1' });
    const invalidate = () => agent.invalidateIdentity();
    expect(invalidate).not.toThrowError();
  });
  it('should throw an error instead of making a call if its identity is invalidated', async () => {
    const canisterId: Principal = Principal.fromText('2chl6-4hpzw-vqaaa-aaaaa-c');
    const identity = new AnonymousIdentity();
    const agent = new HttpAgent({ identity, fetch: mockFetch, host: 'http://127.0.0.1' });
    agent.invalidateIdentity();

    const expectedError =
      "This identity has expired due this application's security policy. Please refresh your authentication.";

    expect.assertions(3);
    // Test Agent.call
    try {
      await agent.call(canisterId, {
        methodName: 'test',
        arg: new ArrayBuffer(16),
      });
    } catch (error) {
      expect((error as Error).message).toBe(expectedError);
    }
    // Test Agent.query
    try {
      await agent.query(canisterId, {
        methodName: 'test',
        arg: new ArrayBuffer(16),
      });
    } catch (error) {
      expect((error as Error).message).toBe(expectedError);
    }
    // Test readState
    try {
      const path = bufFromBufLike(utf8ToBytes('request_status'));
      await agent.readState(canisterId, {
        paths: [[path]],
      });
    } catch (error) {
      expect((error as Error).message).toBe(expectedError);
    }
  });
});
describe('replace identity', () => {
  const mockFetch: jest.Mock = jest.fn();
  it('should allow an actor to replace its identity', () => {
    const identity = new AnonymousIdentity();
    const agent = new HttpAgent({ identity, fetch: mockFetch, host: 'http://127.0.0.1' });

    const identity2 = new AnonymousIdentity();
    const replace = () => agent.replaceIdentity(identity2);
    expect(replace).not.toThrowError();
  });
  it('should use the new identity in calls', async () => {
    const mockFetch: jest.Mock = jest.fn(() => {
      return Promise.resolve(
        new Response(null, {
          status: 200,
        }),
      );
    });

    const canisterId: Principal = Principal.fromText('2chl6-4hpzw-vqaaa-aaaaa-c');
    const identity = new AnonymousIdentity();
    const agent = new HttpAgent({ identity, fetch: mockFetch, host: 'http://127.0.0.1' });
    // First invalidate identity
    agent.invalidateIdentity();
    expect.assertions(3);
    try {
      await agent.query(canisterId, {
        methodName: 'test',
        arg: new ArrayBuffer(16),
      });
    } catch (error) {
      expect(error).toBeInstanceOf(AgentError);
      expect(error.cause.code).toBeInstanceOf(IdentityInvalidErrorCode);
    }

    // Then, add new identity
    const identity2 = createIdentity(0) as unknown as SignIdentity;
    agent.replaceIdentity(identity2);
    await agent.call(canisterId, {
      methodName: 'test',
      arg: new ArrayBuffer(16),
    });
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});

describe('makeNonce', () => {
  it('should create unique values', () => {
    const nonces = new Set();
    for (let i = 0; i < 100; i++) {
      nonces.add(toHex(bufFromBufLike(makeNonce())));
    }
    expect(nonces.size).toBe(100);
  });

  describe('setBigUint64 polyfill', () => {
    beforeAll(() => {
      jest.spyOn(Math, 'random').mockImplementation(() => 0.5);
      jest
        .spyOn(global.crypto, 'getRandomValues')
        .mockImplementation((array: ArrayBufferView | null) => {
          const view = new Uint8Array(array!.buffer, array!.byteOffset, array!.byteLength);
          for (let i = 0; i < view.length; i++) {
            view[i] = Math.floor(Math.random() * 256);
          }
          return array;
        });
    });

    afterAll(() => {
      jest.clearAllMocks();
      jest.restoreAllMocks();
    });

    it('should create same value using polyfill', () => {
      const spyOnSetUint32 = jest.spyOn(DataView.prototype, 'setUint32').mockImplementation();
      const originalNonce = toHex(bufFromBufLike(makeNonce()));
      expect(spyOnSetUint32).toBeCalledTimes(4);

      const nonce = toHex(bufFromBufLike(makeNonce()));
      expect(spyOnSetUint32).toBeCalledTimes(8);

      expect(nonce).toBe(originalNonce);
    });
    it.skip('should insert the nonce as a header in the request', async () => {
      const mockFetch: jest.Mock = jest.fn(() => {
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
  beforeEach(() => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();
    consoleSpy.mockRestore();
  });

  it('should throw errors immediately if retryTimes is set to 0', async () => {
    const mockFetch: jest.Mock = jest.fn(
      () =>
        new Response('Error', {
          status: 500,
          statusText: 'Internal Server Error',
        }),
    );
    const agent = new HttpAgent({ host: HTTP_AGENT_HOST, fetch: mockFetch, retryTimes: 0 });
    const performCall = async () =>
      await agent.call(Principal.managementCanister(), {
        methodName: 'test',
        arg: new Uint8Array().buffer,
      });
    expect.assertions(4);
    try {
      await performCall();
    } catch (error) {
      expect(error).toBeInstanceOf(AgentError);
      expect(error.cause.code).toBeInstanceOf(HttpErrorCode);
      expect(error.cause.code.requestContext).toBeDefined();
    }
    expect(mockFetch.mock.calls.length).toBe(1);
  });
  it('should throw errors after 3 retries by default', async () => {
    jest.useFakeTimers();
    jest.spyOn(global, 'setTimeout').mockImplementation(callback => {
      if (typeof callback === 'function') {
        callback();
      }
      return { hasRef: () => false } as NodeJS.Timeout;
    });
    const mockFetch: jest.Mock = jest.fn(() => {
      return new Response('Error', {
        status: 500,
        statusText: 'Internal Server Error',
      });
    });

    const agent = new HttpAgent({ host: HTTP_AGENT_HOST, fetch: mockFetch });
    expect.assertions(4);
    try {
      await agent.call(Principal.managementCanister(), {
        methodName: 'test',
        arg: new Uint8Array().buffer,
      });
    } catch (error) {
      expect(error).toBeInstanceOf(AgentError);
      expect(error.cause.code).toBeInstanceOf(HttpErrorCode);
      expect(error.cause.code.requestContext).toBeDefined();
      // One try + three retries
      expect(mockFetch.mock.calls.length).toEqual(4);
    }
  });
  it('should succeed after multiple failures within the configured limit', async () => {
    jest.useFakeTimers();
    jest.spyOn(global, 'setTimeout').mockImplementation(callback => {
      if (typeof callback === 'function') {
        callback();
      }
      return { hasRef: () => false } as NodeJS.Timeout;
    });
    let calls = 0;
    const mockFetch: jest.Mock = jest.fn(() => {
      if (calls === 3) {
        return new Response(null, {
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
    // Remove the request details to make the snapshot consistent
    result.requestDetails = undefined;
    expect(result).toMatchSnapshot();
    // One try + three retries
    expect(mockFetch.mock.calls.length).toBe(4);
  });
});
jest.useFakeTimers({ legacyFakeTimers: true });

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

  expect(requestBody.content.ingress_expiry).toMatchInlineSnapshot(`1260000000000`);

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

  expect(requestBody.content.ingress_expiry).toMatchInlineSnapshot(`1200000000000`);

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
    host: 'http://127.0.0.1',
    callOptions: {
      reactNative: { textStreaming: true },
    },
    fetchOptions: {
      reactNative: {
        __nativeResponseType: 'base64',
      },
    },
    verifyQuerySignatures: false,
  });

  await httpAgent.call(canisterId, {
    methodName: 'greet',
    arg: bufFromBufLike(new Uint8Array([])),
  });

  await httpAgent.query(canisterId, {
    methodName: 'greet',
    arg: bufFromBufLike(new Uint8Array([])),
  });

  const { calls } = mockFetch.mock;

  expect(calls[0][1].reactNative).toStrictEqual({ textStreaming: true });
  expect(calls[1][1].reactNative.__nativeResponseType).toBe('base64');
});

describe('default host', () => {
  it('should use a default host of icp-api.io', () => {
    const agent = new HttpAgent({ fetch: jest.fn() });
    expect((agent as any).host.hostname).toBe('icp-api.io');
  });
  it('should use a default of icp-api.io if location is not available', () => {
    delete (global as any).window;
    const agent = new HttpAgent({ fetch: jest.fn() });
    expect((agent as any).host.hostname).toBe('icp-api.io');
  });
  it('should use the existing host if the agent is used on a known hostname', () => {
    const knownHosts = ['ic0.app', 'icp0.io', '127.0.0.1', 'localhost'];
    for (const host of knownHosts) {
      delete (window as any).location;
      (window as any).location = {
        hostname: host,
        protocol: 'https:',
      } as any;
      const agent = HttpAgent.createSync({ fetch: jest.fn(), host });
      expect((agent as any).host.hostname).toBe(host);
    }
  });
  it('should correctly handle subdomains on known hosts', () => {
    const knownHosts = ['ic0.app', 'icp0.io', '127.0.0.1', 'localhost'];
    for (const host of knownHosts) {
      delete (window as any).location;
      (window as any).location = {
        host: `foo.${host}`,
        hostname: `rrkah-fqaaa-aaaaa-aaaaq-cai.${host}`,
        protocol: 'https:',
      } as any;
      const agent = new HttpAgent({ fetch: jest.fn() });
      expect(agent.host.hostname).toBe(host);
    }
  });
  it('should correctly handle subdomains on remote hosts', async () => {
    const remoteHosts = [
      '000.gitpod.io',
      '000.github.dev',
      '4943-dfinity-candid-6715adkgujw.ws-us107.gitpod.io',
      'sturdy-space-rotary-phone-674vv99gxf4x9j-4943.app.github.dev',
    ];
    for (const host of remoteHosts) {
      delete (window as any).location;
      (window as any).location = {
        host: host,
        hostname: host,
        protocol: 'https:',
      } as any;
      const agent = await HttpAgent.createSync({ fetch: jest.fn() });
      expect(agent.host.toString()).toBe(`https://${host}/`);
    }
  });
  it('should handle port numbers for 127.0.0.1 and localhost', async () => {
    const knownHosts = ['127.0.0.1', 'localhost'];
    for (const host of knownHosts) {
      delete (window as any).location;
      // hostname is different from host when port is specified
      (window as any).location = {
        host: `${host}:4943`,
        hostname: `${host}`,
        protocol: 'http:',
        port: '4943',
      } as any;
      const agent = await HttpAgent.createSync({ fetch: jest.fn() });
      expect(agent.host.toString()).toBe(`http://${host}:4943/`);
    }
  });
});

jest.setTimeout(10000);
test('retry requests that fail due to a network failure', async () => {
  jest.useFakeTimers();
  const mockFetch: jest.Mock = jest.fn(() => {
    throw new Error('Network failure');
  });
  jest.spyOn(global, 'setTimeout').mockImplementation(callback => {
    if (typeof callback === 'function') {
      callback();
    }
    return { hasRef: () => false } as NodeJS.Timeout;
  });

  const agent = new HttpAgent({
    host: HTTP_AGENT_HOST,
    fetch: mockFetch,
  });

  agent.rootKey = bufFromBufLike(new Uint8Array(32));

  expect.assertions(1);
  try {
    await agent.call(Principal.managementCanister(), {
      methodName: 'test',
      arg: new Uint8Array().buffer,
    });
  } catch {
    // One try + three retries
    expect(mockFetch.mock.calls.length).toBe(4);
  }
});

test.todo('retry query signature validation after refreshing the subnet node keys');

test('it should log errors to console if the option is set', async () => {
  const agent = new HttpAgent({ host: HTTP_AGENT_HOST, fetch: jest.fn(), logToConsole: true });
  await agent.syncTime();
});

test('it should fail when setting an expiry in the past', async () => {
  expect(() =>
    HttpAgent.createSync({
      host: 'https://icp-api.io',
      ingressExpiryInMinutes: -1,
      fetch: jest.fn(),
    }),
  ).toThrow(`Ingress expiry time must be greater than 0`);
});

test('it should handle calls against the ic-management canister that are rejected', async () => {
  const identity = new AnonymousIdentity();
  identity.getPrincipal().toString();

  // Response generated by calling a locally deployed replica of the management canister, cloned using fetchCloner
  const mockResponse = {
    headers: [
      ['access-control-allow-origin', '*'],
      ['content-length', '178'],
      ['content-type', 'application/cbor'],
      ['date', 'Mon, 21 Oct 2024 23:35:59 GMT'],
    ],
    ok: true,
    status: 200,
    statusText: 'OK',
    body: 'd9d9f7a46673746174757378186e6f6e5f7265706c6963617465645f72656a656374696f6e6a6572726f725f636f6465664943303531326b72656a6563745f636f6465056e72656a6563745f6d657373616765785d4f6e6c7920636f6e74726f6c6c657273206f662063616e697374657220626b797a322d666d6161612d61616161612d71616161712d6361692063616e2063616c6c2069633030206d6574686f642063616e69737465725f737461747573',
    now: 1729553760128,
  };

  // Mock the fetch implementation, resolving a pre-calculated response
  const mockFetch: jest.Mock = jest.fn(() => {
    return Promise.resolve({
      ...mockResponse,
      body: fromHex(mockResponse.body),
      arrayBuffer: async () => fromHex(mockResponse.body),
    });
  });

  // Mock time so certificates can be accurately decoded
  jest.useFakeTimers();
  jest.setSystemTime(mockResponse.now);

  const agent = await HttpAgent.createSync({
    identity,
    fetch: mockFetch,
    host: 'http://localhost:4943',
  });

  // Use management canister call
  const management = getManagementCanister({ agent });

  // Call snapshot was made when the test canister was not authorized to be called by the anonymous identity. It should reject
  expect(
    management.canister_status({
      canister_id: Principal.from('bkyz2-fmaaa-aaaaa-qaaaq-cai'),
    }),
  ).rejects.toThrow(
    'Only controllers of canister bkyz2-fmaaa-aaaaa-qaaaq-cai can call ic00 method canister_status',
  );
});
test('it should handle calls against the ic-management canister that succeed', async () => {
  const identity = new AnonymousIdentity();

  // Response generated by calling a locally deployed replica of the management canister, cloned using fetchCloner
  const mockResponse = {
    headers: [
      ['access-control-allow-origin', '*'],
      ['content-length', '761'],
      ['content-type', 'application/cbor'],
      ['date', 'Tue, 22 Oct 2024 22:19:07 GMT'],
    ],
    ok: true,
    status: 200,
    statusText: 'OK',
    body: 'd9d9f7a266737461747573677265706c6965646b63657274696669636174655902d7d9d9f7a26474726565830183018204582012dbb02955bd3e2987bbba491230b2bb4a593feb02b5bb2d08f5f861afa9cec28301820458202b60693266aeec370be9f54508af493f4dd740086476054c862fe5af17ab15c183024e726571756573745f73746174757383018301820458204bebdfa0327978bfb109f0e14b35e8d368bb62114628ae547386162e9ee3dad883025820cf1cd57f39dfbb40ca1c816c71407c8b1b2edfb5a632676c7917dc4aa8641c5283018302457265706c7982035901684449444c0a6c0b9cb1fa2568b2ceef2f01c0cff2717d9cbab69c0202ffdb81f7037d8daacd94087de3f9f5d90805e8fc8cec0908b0e4d2970a7d81cfaef40a0984aaa89e0f7d6b038da4879b047ff496e4910b7fffdba5db0e7f6d036c020004017d6d7b6c089cb1fa2568c0cff2717dd7e09b90020680ad988a047dedd9c8c90707f8e287cc0c7ddeebb5a90e7da882acc60f7d6d686b02d7e09b90027fa981ceb7067f6c04c1f8dc83037d83cac6e9057da1d0b8af0a7d8fd0cfd00f7d6e040100011100001945cd0f5904e6ce2e5ac91900fb0102809a9e01010100b9f384b5ff59d4b88c01b9f384b5ff59011100001945cd0f5904e6ce2e5ac91900fb01809a9e0103010104010a80000000001000000101011d9a1e6bf09022ffccbffa69fc8e083bb02d5079d48b3640c086b9bfb10280a0e5b9c291010000000000000000aab36e0120fe9be8c73192343439c983d14da2f37a593269285d310fd2c11d4970e5f16eb6008302467374617475738203477265706c69656482045820daeffcc5dadc3aca94e0dc470e429ad4e3bc08517b5776f6a71e7e6982883bef8301820458208e6c6a7c4ba444475de4f4cd2d6df9501873d3290693060faf92e6dc528ee08083024474696d65820349a88dd3f9dacbb98018697369676e6174757265583088040a8228ef3f428c61918c5fb356e74b2ab07aa19f960edbb1fdfcbbc115e35f2e6c3f33b5cf4752799619e67e2b22',
    now: 1729635546372,
  };

  // Mock the fetch implementation, resolving a pre-calculated response
  const mockFetch: jest.Mock = jest.fn(() => {
    return Promise.resolve({
      ...mockResponse,
      body: fromHex(mockResponse.body),
      arrayBuffer: async () => fromHex(mockResponse.body),
    });
  });

  // Mock time so certificates can be accurately decoded
  jest.useFakeTimers();
  jest.setSystemTime(mockResponse.now);

  // Pass in rootKey from replica (used because test was written using local replica)
  const agent = await HttpAgent.createSync({
    identity,
    fetch: mockFetch,
    host: 'http://localhost:4943',
    rootKey: fromHex(
      '308182301d060d2b0601040182dc7c0503010201060c2b0601040182dc7c050302010361008be882f1985cccb53fd551571a42818014835ed8f8a27767669b67dd4a836eb0d62b327e3368a80615b0e4f472c73f7917c036dc9317dcb64b319a1efa43dd7c656225c061de359db6fdf7033ac1bff24c944c145e46ebdce2093680b6209a13',
    ),
  });

  // Use management canister call
  const management = getManagementCanister({ agent });

  // Important - override nonce when making request to ensure reproducible result
  (Actor.agentOf(management) as HttpAgent).addTransform('update', async args => {
    args.body.nonce = new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7]) as Nonce;
    return args;
  });

  // Call snapshot was made after the test canister was authorized to be called by the anonymous identity. It should resolve the status
  const status = await management.canister_status({
    canister_id: Principal.from('bkyz2-fmaaa-aaaaa-qaaaq-cai'),
  });

  expect(status).toMatchSnapshot();
});

describe('await fetching root keys before making a call to the network.', () => {
  const mockResponse = {
    headers: [
      ['access-control-allow-origin', '*'],
      ['content-length', '317'],
      ['content-type', 'application/cbor'],
      ['date', 'Sat, 25 Jan 2025 00:48:00 GMT'],
    ],
    ok: true,
    status: 200,
    statusText: 'OK',
    body: 'd9d9f7a66e69635f6170695f76657273696f6e66302e31382e3068726f6f745f6b65795885308182301d060d2b0601040182dc7c0503010201060c2b0601040182dc7c05030201036100a05a4707525774767f395a97ea9cd670ebf8694c4649421cdec91d86fa16beee0250e1ef64ec3b1eecb2ece53235ae0e0433592804c8947359694912cd743e5cba7d9bf705f875da3b36d12ec7eb94fb437bd31c255d2a6d65b964e0430f93686c696d706c5f76657273696f6e65302e392e3069696d706c5f686173687840646536376636313133633830316163326137386463663739623431376530306365343361366233636136636161346366616239636236653338383136643534757265706c6963615f6865616c74685f737461747573676865616c746879706365727469666965645f6865696768741a0003f560',
    now: 1737766080180,
  };
  jest.useFakeTimers();
  // Mock the fetch implementation, resolving a pre-calculated response
  const mockFetch: jest.Mock = jest.fn(() => {
    return Promise.resolve({
      ...mockResponse,
      body: fromHex(mockResponse.body),
      arrayBuffer: async () => fromHex(mockResponse.body),
    });
  });
  it('should allow fetchRootKey to be awaited after using the constructor', async () => {
    const agent = new HttpAgent({
      shouldFetchRootKey: true,
      host: 'http://localhost:4943',
      fetch: mockFetch,
    });
    expect(agent.rootKey).toBe(null);
    await agent.fetchRootKey();
    expect(ArrayBuffer.isView(agent.rootKey)).toBe(true);
  });
  it('should allow fetchRootKey to be awaited after using createSync', async () => {
    const agent = HttpAgent.createSync({
      shouldFetchRootKey: true,
      host: 'http://localhost:4943',
      fetch: mockFetch,
    });
    expect(agent.rootKey).toBe(null);
    await agent.fetchRootKey();
    expect(ArrayBuffer.isView(agent.rootKey)).toBe(true);
  });
  it('it should automatically fetch root key if using create', async () => {
    const agent = await HttpAgent.create({
      shouldFetchRootKey: true,
      host: 'http://localhost:4943',
      fetch: mockFetch,
    });
    expect(ArrayBuffer.isView(agent.rootKey)).toBe(true);
  });

  it('it should automatically fetch root key during async calls if one was not set during initialization', async () => {
    const canisterId: Principal = Principal.fromText('2chl6-4hpzw-vqaaa-aaaaa-c');

    const agent = new HttpAgent({
      fetch: mockFetch,
      host: 'http://localhost:4943',
      shouldFetchRootKey: true,
    });
    expect(agent.rootKey).toBe(null);

    const methodName = 'greet';
    const arg = bufFromBufLike(new Uint8Array([]));

    await agent.call(canisterId, {
      methodName,
      arg,
    });
    expect(agent.rootKey).toBeTruthy();
  });
});

describe('transform', () => {
  const identity = new AnonymousIdentity();

  // Response generated by calling a locally deployed replica of the management canister, cloned using fetchCloner
  const mockResponse = {
    headers: [
      ['access-control-allow-origin', '*'],
      ['content-length', '761'],
      ['content-type', 'application/cbor'],
      ['date', 'Tue, 22 Oct 2024 22:19:07 GMT'],
    ],
    ok: true,
    status: 200,
    statusText: 'OK',
    body: 'd9d9f7a266737461747573677265706c6965646b63657274696669636174655902d7d9d9f7a26474726565830183018204582012dbb02955bd3e2987bbba491230b2bb4a593feb02b5bb2d08f5f861afa9cec28301820458202b60693266aeec370be9f54508af493f4dd740086476054c862fe5af17ab15c183024e726571756573745f73746174757383018301820458204bebdfa0327978bfb109f0e14b35e8d368bb62114628ae547386162e9ee3dad883025820cf1cd57f39dfbb40ca1c816c71407c8b1b2edfb5a632676c7917dc4aa8641c5283018302457265706c7982035901684449444c0a6c0b9cb1fa2568b2ceef2f01c0cff2717d9cbab69c0202ffdb81f7037d8daacd94087de3f9f5d90805e8fc8cec0908b0e4d2970a7d81cfaef40a0984aaa89e0f7d6b038da4879b047ff496e4910b7fffdba5db0e7f6d036c020004017d6d7b6c089cb1fa2568c0cff2717dd7e09b90020680ad988a047dedd9c8c90707f8e287cc0c7ddeebb5a90e7da882acc60f7d6d686b02d7e09b90027fa981ceb7067f6c04c1f8dc83037d83cac6e9057da1d0b8af0a7d8fd0cfd00f7d6e040100011100001945cd0f5904e6ce2e5ac91900fb0102809a9e01010100b9f384b5ff59d4b88c01b9f384b5ff59011100001945cd0f5904e6ce2e5ac91900fb01809a9e0103010104010a80000000001000000101011d9a1e6bf09022ffccbffa69fc8e083bb02d5079d48b3640c086b9bfb10280a0e5b9c291010000000000000000aab36e0120fe9be8c73192343439c983d14da2f37a593269285d310fd2c11d4970e5f16eb6008302467374617475738203477265706c69656482045820daeffcc5dadc3aca94e0dc470e429ad4e3bc08517b5776f6a71e7e6982883bef8301820458208e6c6a7c4ba444475de4f4cd2d6df9501873d3290693060faf92e6dc528ee08083024474696d65820349a88dd3f9dacbb98018697369676e6174757265583088040a8228ef3f428c61918c5fb356e74b2ab07aa19f960edbb1fdfcbbc115e35f2e6c3f33b5cf4752799619e67e2b22',
    now: 1729635546372,
  };

  // Mock the fetch implementation, resolving a pre-calculated response
  const mockFetch: jest.Mock = jest.fn(() => {
    return Promise.resolve({
      ...mockResponse,
      body: fromHex(mockResponse.body),
      arrayBuffer: async () => fromHex(mockResponse.body),
    });
  });

  let management: ActorSubclass<ManagementCanisterRecord>;
  let spy: jest.SpyInstance;

  beforeEach(async () => {
    // Mock time so certificates can be accurately decoded
    jest.useFakeTimers();
    jest.setSystemTime(mockResponse.now);

    // Pass in rootKey from replica (used because test was written using local replica)
    const agent = await HttpAgent.createSync({
      identity,
      fetch: mockFetch,
      host: 'http://localhost:4943',
      rootKey: fromHex(
        '308182301d060d2b0601040182dc7c0503010201060c2b0601040182dc7c050302010361008be882f1985cccb53fd551571a42818014835ed8f8a27767669b67dd4a836eb0d62b327e3368a80615b0e4f472c73f7917c036dc9317dcb64b319a1efa43dd7c656225c061de359db6fdf7033ac1bff24c944c145e46ebdce2093680b6209a13',
      ),
    });

    // Use management canister call
    management = getManagementCanister({ agent });

    // Important - override nonce when making request to ensure reproducible result
    (Actor.agentOf(management) as HttpAgent).addTransform('update', async args => {
      args.body.nonce = new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7]) as Nonce;
      return args;
    });

    spy = jest.spyOn(Actor.agentOf(management) as HttpAgent, 'call');
  });

  test('it should use target_canister as effective canister id for calls against the ic-management canister', async () => {
    const target_canister = Principal.from('bkyz2-fmaaa-aaaaa-qaaaq-cai');

    await management.install_chunked_code({
      arg: new Uint8Array([1, 2, 3]),
      wasm_module_hash: new Uint8Array([4, 5, 6]),
      mode: { install: null },
      chunk_hashes_list: [],
      target_canister,
      store_canister: [],
      sender_canister_version: [],
    });

    expect(spy).toHaveBeenCalledWith(
      Principal.fromHex(''),
      expect.objectContaining({
        effectiveCanisterId: target_canister,
      }),
    );
  });

  test('it should use canister_id as effective canister id for calls against the ic-management canister if target_canister is provided but install_chunked_code is not', async () => {
    const target_canister = Principal.from('ryjl3-tyaaa-aaaaa-aaaba-cai');
    const canister_id = Principal.from('bkyz2-fmaaa-aaaaa-qaaaq-cai');

    await management.stop_canister({
      canister_id,
      target_canister,
    } as unknown as { canister_id: Principal; target_canister_id: Principal });

    expect(spy).toHaveBeenCalledWith(
      Principal.fromHex(''),
      expect.objectContaining({
        effectiveCanisterId: canister_id,
      }),
    );
  });

  test('it should use canister_id as effective canister id for calls against the ic-management canister', async () => {
    const canister_id = Principal.from('bkyz2-fmaaa-aaaaa-qaaaq-cai');

    await management.stop_canister({ canister_id });

    expect(spy).toHaveBeenCalledWith(
      Principal.fromHex(''),
      expect.objectContaining({
        effectiveCanisterId: canister_id,
      }),
    );
  });
});

describe('error logs for bad signature', () => {
  const badSignatureResponse = {
    headers: [
      ['access-control-allow-origin', '*'],
      ['content-length', '332'],
      ['content-type', 'text/plain; charset=utf-8'],
      ['date', 'Fri, 31 Jan 2025 18:53:47 GMT'],
    ],
    ok: false,
    status: 400,
    statusText: 'Bad Request',
    body: '496e76616c6964207369676e61747572653a20496e76616c6964206261736963207369676e61747572653a2045643235353139207369676e617475726520636f756c64206e6f742062652076657269666965643a207075626c6963206b657920336236613237626363656236613432643632613361386430326136663064373336353332313537373164653234336136336163303438613138623539646132392c207369676e61747572652030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030302c206572726f723a2041207369676e61747572652077617320696e76616c6964',
    now: 1738349617614,
  };
  const mockFetch: jest.Mock = jest.fn(() => {
    return Promise.resolve({
      ...badSignatureResponse,
      body: fromHex(badSignatureResponse.body),
      clone: () => {
        return {
          ...badSignatureResponse,
          text: async () =>
            'Invalid signature: Invalid basic signature: Ed25519 signature could not be verified: public key 3b6a27bcceb6a42d62a3a8d02a6f0d73653215771de243a63ac048a18b59da29, signature 00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000, error: A signature was invalid\n',
        };
      },
    });
  });
  it('should throw call errors if provided an invalid signature', async () => {
    jest.useRealTimers();
    // jest.setSystemTime(badSignatureResponse.now);

    jest.spyOn(Date, 'now').mockImplementation(() => 1738362489290);
    global.clearTimeout = jest.fn();

    const identity = Ed25519KeyIdentity.generate(new Uint8Array(32)) as unknown as SignIdentity;
    identity.sign = async () => {
      return new ArrayBuffer(64) as Signature;
    };
    const agent = HttpAgent.createSync({
      identity,
      fetch: mockFetch,
      retryTimes: 0,
      host: 'http://localhost:4943',
    });
    // Important - override nonce when making request to ensure reproducible result
    agent.addTransform('update', async args => {
      args.body.nonce = new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7]) as Nonce;
      return args;
    });
    const canisterId: Principal = Principal.fromText('2chl6-4hpzw-vqaaa-aaaaa-c');

    const methodName = 'greet';
    const arg = bufFromBufLike(new Uint8Array([]));
    const logs: {
      message: string;
      level: 'error';
      error: AgentError;
    }[] = [];
    agent.log.subscribe(e => {
      if (e.level === 'error') {
        logs.push(e);
      }
    });

    expect.assertions(7);
    try {
      await agent.call(canisterId, {
        methodName,
        arg,
      });
    } catch (error) {
      expect(error).toBeInstanceOf(AgentError);
      expect(error.cause.code).toBeInstanceOf(HttpErrorCode);
      expect(error.cause.code.requestContext).toBeDefined();
    }
    expect(JSON.stringify(logs[0])).toMatchSnapshot();
    expect(logs[0].error).toBeInstanceOf(AgentError);
    expect(logs[0].error.cause.code).toBeInstanceOf(HttpErrorCode);
    expect(logs[0].error.cause.code.requestContext).toBeDefined();
  });
  it('should throw query errors for bad signature', async () => {
    jest.spyOn(Date, 'now').mockImplementation(() => 1738362489290);
    global.clearTimeout = jest.fn();

    const identity = Ed25519KeyIdentity.generate(new Uint8Array(32)) as unknown as SignIdentity;
    identity.sign = async () => {
      return new ArrayBuffer(64) as Signature;
    };
    const agent = HttpAgent.createSync({
      identity,
      fetch: mockFetch,
      retryTimes: 0,
      host: 'http://localhost:4943',
    });
    const canisterId: Principal = Principal.fromText('2chl6-4hpzw-vqaaa-aaaaa-c');

    const methodName = 'greet';
    const arg = bufFromBufLike(new Uint8Array([]));
    const logs: {
      message: string;
      level: 'error';
      error: AgentError;
    }[] = [];
    agent.log.subscribe(e => {
      if (e.level === 'error') {
        logs.push(e);
      }
    });

    expect.assertions(7);
    try {
      await agent.query(canisterId, {
        methodName,
        arg,
      });
    } catch (error) {
      expect(error).toBeInstanceOf(AgentError);
      expect(error.cause.code).toBeInstanceOf(HttpFetchErrorCode);
      expect(error.cause.code.requestContext).toBeDefined();
    }
    expect(JSON.stringify(logs[0])).toMatchSnapshot();
    expect(logs[0].error).toBeInstanceOf(AgentError);
    expect(logs[0].error.cause.code).toBeInstanceOf(HttpFetchErrorCode);
    expect(logs[0].error.cause.code.requestContext).toBeDefined();
  });

  it('should throw read_state errors for bad signature', async () => {
    const clonedReadStateResponse = {
      headers: [
        ['access-control-allow-origin', '*'],
        ['content-length', '332'],
        ['content-type', 'text/plain; charset=utf-8'],
        ['date', 'Thu, 06 Feb 2025 22:21:52 GMT'],
      ],
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      body: '496e76616c6964207369676e61747572653a20496e76616c6964206261736963207369676e61747572653a2045643235353139207369676e617475726520636f756c64206e6f742062652076657269666965643a207075626c6963206b657920336236613237626363656236613432643632613361386430326136663064373336353332313537373164653234336136336163303438613138623539646132392c207369676e61747572652030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030302c206572726f723a2041207369676e61747572652077617320696e76616c6964',
      now: 1738880304205,
    };

    const mockFetch: jest.Mock = jest.fn(() => {
      return Promise.resolve({
        ...clonedReadStateResponse,
        clone: () => {
          return {
            ...badSignatureResponse,
            body: fromHex(badSignatureResponse.body),
            text: async () =>
              'Invalid signature: Invalid basic signature: Ed25519 signature could not be verified: public key 3b6a27bcceb6a42d62a3a8d02a6f0d73653215771de243a63ac048a18b59da29, signature 00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000, error: A signature was invalid\n',
          };
        },
      });
    });

    const identity = Ed25519KeyIdentity.generate(new Uint8Array(32)) as unknown as SignIdentity;

    identity.sign = async () => {
      return new ArrayBuffer(64) as Signature;
    };
    const agent = HttpAgent.createSync({
      identity,
      fetch: mockFetch,
      retryTimes: 0,
      host: 'http://localhost:4943',
    });

    const canisterId: Principal = Principal.fromText('2chl6-4hpzw-vqaaa-aaaaa-c');
    jest.useRealTimers();

    jest.spyOn(Date, 'now').mockImplementation(() => 1738880304205);

    const logs: {
      message: string;
      level: 'error';
      error: AgentError;
    }[] = [];
    agent.log.subscribe(e => {
      if (e.level === 'error') {
        logs.push(e);
      }
    });

    expect.assertions(6);
    try {
      const requestId = new ArrayBuffer(32) as RequestId;
      const path = bufFromBufLike(utf8ToBytes('request_status'));
      await agent.readState(canisterId, { paths: [[path, requestId]] });
    } catch (error) {
      expect(error).toBeInstanceOf(AgentError);
      expect(error.cause.code).toBeInstanceOf(HttpErrorCode);
      expect(error.cause.code.requestContext).toBeDefined();
    }
    expect(logs[0].error).toBeInstanceOf(AgentError);
    expect(logs[0].error.cause.code).toBeInstanceOf(HttpErrorCode);
    expect(logs[0].error.cause.code.requestContext).toBeDefined();
  });
});

/**
 * Test utility to clone a fetch response for mocking purposes with the agent
 * @param request - RequestInfo
 * @param init - RequestInit
 * @returns Promise<Response>
 */
export async function fetchCloner(
  request: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const response = await fetch(request, init);
  const cloned = response.clone();
  const responseBuffer = await cloned.arrayBuffer();

  const mock = {
    headers: [...response.headers.entries()],
    ok: response.ok,
    status: response.status,
    statusText: response.statusText,
    body: toHex(responseBuffer),
    now: Date.now(),
  };

  console.log(request);
  console.log(JSON.stringify(mock));

  return response;
}
