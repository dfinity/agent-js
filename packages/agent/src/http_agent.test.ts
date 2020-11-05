import { Buffer } from 'buffer/';
import { HttpAgent } from './agent';
import {
  createKeyPairFromSeed,
  derEncodeED25519PublicKey,
  makeAuthTransform,
  SenderSig,
  sign,
  verify,
} from './auth';
import * as cbor from './cbor';
import { Expiry, makeNonceTransform } from './http_agent_transforms';
import {
  CallRequest,
  Envelope,
  ReadRequestType,
  RequestStatusResponseReplied,
  Signed,
  SubmitRequestType,
} from './http_agent_types';
import { Principal } from './principal';
import { requestIdOf } from './request_id';
import { BinaryBlob } from './types';
import { Nonce } from './types';

const originalDateNowFn = global.Date.now;
beforeEach(() => {
  global.Date.now = jest.fn(() => new Date(1000000).getTime());
});
afterEach(() => {
  global.Date.now = originalDateNowFn;
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
  const nonce = Buffer.from([0, 1, 2, 3, 4, 5, 6, 7]) as Nonce;
  // prettier-ignore
  const seed = Buffer.from([
    0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
    0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
  ]);
  const keyPair = createKeyPairFromSeed(seed);
  const principal = await Principal.selfAuthenticating(keyPair.publicKey);

  const httpAgent = new HttpAgent({
    fetch: mockFetch,
    principal,
  });
  httpAgent.addTransform(makeNonceTransform(() => nonce));
  httpAgent.setAuthTransform(makeAuthTransform(keyPair));

  const methodName = 'greet';
  const arg = Buffer.from([]) as BinaryBlob;

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
    sender: principal.toBlob(),
    ingress_expiry: new Expiry(300000),
  };

  const mockPartialsRequestId = await requestIdOf(mockPartialRequest);
  const senderSig = sign(mockPartialsRequestId, keyPair.secretKey);
  // Just sanity checking our life.
  expect(verify(mockPartialsRequestId, senderSig, keyPair.publicKey)).toBe(true);

  const expectedRequest: Signed<CallRequest> = {
    content: mockPartialRequest,
    sender_pubkey: derEncodeED25519PublicKey(keyPair.publicKey),
    sender_sig: senderSig,
  } as Signed<CallRequest>;

  const expectedRequestId = await requestIdOf(expectedRequest.content);
  expect(expectedRequestId).toEqual(mockPartialsRequestId);

  const { calls, results } = mockFetch.mock;
  expect(calls.length).toBe(1);
  expect(requestId).toEqual(expectedRequestId);

  expect(calls[0][0]).toBe('http://localhost/api/v1/submit');
  expect(calls[0][1]).toEqual({
    method: 'POST',
    headers: {
      'Content-Type': 'application/cbor',
    },
    body: cbor.encode(expectedRequest),
  });
});

test.todo('query');

test('requestStatus', async () => {
  const mockResponse = {
    status: 'replied',
    reply: { arg: Buffer.from([]) as BinaryBlob },
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
  const nonce = Buffer.from([0, 1, 2, 3, 4, 5, 6, 7]) as Nonce;

  // prettier-ignore
  const seed = Buffer.from([
    0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
    0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
  ]);
  const keyPair = createKeyPairFromSeed(seed);
  const principal = await Principal.selfAuthenticating(keyPair.publicKey);

  const httpAgent = new HttpAgent({
    fetch: mockFetch,
    principal,
  });
  httpAgent.addTransform(makeNonceTransform(() => nonce));
  httpAgent.setAuthTransform(makeAuthTransform(keyPair, () => Buffer.from([0]) as SenderSig));

  const requestId = await requestIdOf({
    request_type: SubmitRequestType.Call,
    nonce,
    canister_id: Principal.fromText(canisterIdent),
    method_name: 'greet',
    arg: Buffer.from([]),
    sender: principal.toBlob(),
  });

  const response = await httpAgent.requestStatus({
    requestId,
  });

  const expectedRequest = {
    content: {
      request_type: ReadRequestType.RequestStatus,
      request_id: requestId,
      ingress_expiry: new Expiry(300000),
    },
    sender_pubkey: derEncodeED25519PublicKey(keyPair.publicKey),
    sender_sig: Buffer.from([0]) as SenderSig,
  };

  const { calls, results } = mockFetch.mock;
  expect(calls.length).toBe(1);

  // Trick the type system.
  const {
    reply: { arg: responseArg },
    ...responseRest
  } = response as RequestStatusResponseReplied;

  const {
    reply: { arg: mockResponseArg },
    ...mockResponseRest
  } = mockResponse;

  expect(responseRest).toEqual(mockResponseRest);
  expect(responseArg?.equals(mockResponseArg)).toBe(true);

  expect(calls[0]).toEqual([
    'http://localhost/api/v1/read',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/cbor',
      },
      body: cbor.encode(expectedRequest),
    },
  ]);
});

test('queries with the same content should have the same signature', async () => {
  const mockResponse = {
    status: 'replied',
    reply: { arg: Buffer.from([]) as BinaryBlob },
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
  const nonce = Buffer.from([0, 1, 2, 3, 4, 5, 6, 7]) as Nonce;

  // prettier-ignore
  const seed = Buffer.from([
    0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
    0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
  ]);
  const keyPair = createKeyPairFromSeed(seed);
  const principal = await Principal.selfAuthenticating(keyPair.publicKey);

  const httpAgent = new HttpAgent({
    fetch: mockFetch,
    principal,
  });
  httpAgent.addTransform(makeNonceTransform(() => nonce));
  httpAgent.setAuthTransform(makeAuthTransform(keyPair));

  const methodName = 'greet';
  const arg = Buffer.from([]) as BinaryBlob;

  const requestId = await requestIdOf({
    request_type: SubmitRequestType.Call,
    nonce,
    canister_id: Principal.fromText(canisterIdent),
    method_name: methodName,
    arg,
    sender: principal.toBlob(),
  });

  const response1 = await httpAgent.requestStatus({
    requestId,
  });

  const response2 = await httpAgent.requestStatus({
    requestId,
  });

  const response3 = await httpAgent.query(canisterIdent, { arg, methodName });
  const response4 = await httpAgent.query(canisterIdent, { methodName, arg });

  const { calls } = mockFetch.mock;
  expect(calls.length).toBe(4);

  expect(calls[0]).toEqual(calls[1]);
  expect(response1).toEqual(response2);

  expect(calls[2]).toEqual(calls[3]);
  expect(response3).toEqual(response4);
});

test('use anonymous principal if unspecified', async () => {
  const mockFetch: jest.Mock = jest.fn((resource, init) => {
    return Promise.resolve(
      new Response(null, {
        status: 200,
      }),
    );
  });

  const canisterId: Principal = Principal.fromText('2chl6-4hpzw-vqaaa-aaaaa-c');
  const nonce = Buffer.from([0, 1, 2, 3, 4, 5, 6, 7]) as Nonce;
  const principal = Principal.anonymous();

  const httpAgent = new HttpAgent({ fetch: mockFetch });
  httpAgent.addTransform(makeNonceTransform(() => nonce));

  const methodName = 'greet';
  const arg = Buffer.from([]) as BinaryBlob;

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
    sender: principal.toBlob(),
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

  expect(calls[0][0]).toBe('http://localhost/api/v1/submit');
  expect(calls[0][1]).toEqual({
    method: 'POST',
    headers: {
      'Content-Type': 'application/cbor',
    },
    body: cbor.encode(expectedRequest),
  });
});
