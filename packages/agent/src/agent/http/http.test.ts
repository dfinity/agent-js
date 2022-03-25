import { HttpAgent, Nonce } from '../index';
import * as cbor from '../../cbor';
import { Expiry, makeNonceTransform } from './transforms';
import { CallRequest, Envelope, makeNonce, SubmitRequestType } from './types';
import { Principal } from '@dfinity/principal';
import { requestIdOf } from '../../request_id';

import { JSDOM } from 'jsdom';
import { AnonymousIdentity, SignIdentity } from '../..';
import { Ed25519KeyIdentity } from '../../../../identity/src/identity/ed25519';
import { toHexString } from '../../../../identity/src/buffer';
import { AgentError } from '../../errors';
const { window } = new JSDOM(`<!DOCTYPE html><p>Hello world</p>`);
window.fetch = global.fetch;
global.window = window;

function createIdentity(seed: number): Ed25519KeyIdentity {
  const seed1 = new Array(32).fill(0);
  seed1[0] = seed;
  return Ed25519KeyIdentity.generate(new Uint8Array(seed1));
}

const originalDateNowFn = global.Date.now;
const originalWindow = global.window;
const originalFetch = global.fetch;
beforeEach(() => {
  global.Date.now = jest.fn(() => new Date(1000000).getTime());
  global.window = originalWindow;
  global.fetch = originalFetch;
});

afterEach(() => {
  global.Date.now = originalDateNowFn;
  global.window = originalWindow;
  global.fetch = originalFetch;
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
  httpAgent.addTransform(makeNonceTransform(() => nonce));

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

  expect(calls[0][0]).toBe(`http://localhost/api/v2/canister/${canisterId.toText()}/call`);
  expect(calls[0][1]).toEqual({
    method: 'POST',
    headers: {
      'Content-Type': 'application/cbor',
    },
    body: cbor.encode(expectedRequest),
  });
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

  const httpAgent = new HttpAgent({ fetch: mockFetch, host: 'http://localhost' });
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

  const httpAgent = new HttpAgent({ fetch: mockFetch, host: 'http://localhost' });
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
  expect(calls[0][1]).toEqual({
    method: 'POST',
    headers: {
      'Content-Type': 'application/cbor',
    },
    body: cbor.encode(expectedRequest),
  });
});

describe('getDefaultFetch', () => {
  it("should use fetch from window if it's available", async () => {
    const generateAgent = () => new HttpAgent({ host: 'localhost:8000' });
    expect(generateAgent).not.toThrowError();
  });
  it('should throw an error if fetch is not available on the window object', async () => {
    delete window.fetch;
    const generateAgent = () => new HttpAgent({ host: 'localhost:8000' });

    expect(generateAgent).toThrowError('Fetch implementation was not available');
  });
  it('should throw error for defaultFetch with no window or global fetch', () => {
    delete global.window;
    delete global.fetch;
    const generateAgent = () => new HttpAgent({ host: 'localhost:8000' });

    expect(generateAgent).toThrowError('Fetch implementation was not available');
  });
  it('should fall back to global.fetch if window is not available', () => {
    delete global.window;
    global.fetch = originalFetch;
    const generateAgent = () => new HttpAgent({ host: 'localhost:8000' });

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
describe('makeNonce should create unique values', () => {
  const nonces = new Set();
  for (let i = 0; i < 100; i++) {
    nonces.add(toHexString(makeNonce()));
  }
  expect(nonces.size).toBe(100);
});
