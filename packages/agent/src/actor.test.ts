import { IDL } from '@dfinity/candid';
import { Principal } from '@dfinity/principal';
import { Actor } from './actor';
import { HttpAgent, Nonce } from './agent';
import { Expiry, makeNonceTransform } from './agent/http/transforms';
import { CallRequest, SubmitRequestType, UnSigned } from './agent/http/types';
import * as cbor from './cbor';
import { requestIdOf } from './request_id';

const originalDateNowFn = global.Date.now;
beforeEach(() => {
  global.Date.now = jest.fn(() => new Date(1000000).getTime());
});
afterEach(() => {
  global.Date.now = originalDateNowFn;
});

describe('makeActor', () => {
  // TODO: update tests to be compatible with changes to Certificate
  it.skip('should encode calls', async () => {
    const actorInterface = () => {
      return IDL.Service({
        greet: IDL.Func([IDL.Text], [IDL.Text]),
      });
    };

    const expectedReplyArg = IDL.encode([IDL.Text], ['Hello, World!']);

    const mockFetch: jest.Mock = jest
      .fn()
      .mockImplementationOnce((/*resource, init*/) => {
        return Promise.resolve(
          new Response(null, {
            status: 202,
          }),
        );
      })
      .mockImplementationOnce((resource, init) => {
        const body = cbor.encode({ status: 'received' });
        return Promise.resolve(
          new Response(body, {
            status: 200,
          }),
        );
      })
      .mockImplementationOnce((resource, init) => {
        const body = cbor.encode({ status: 'processing' });
        return Promise.resolve(
          new Response(body, {
            status: 200,
          }),
        );
      })
      .mockImplementationOnce((resource, init) => {
        const body = cbor.encode({
          status: 'replied',
          reply: {
            arg: expectedReplyArg,
          },
        });
        return Promise.resolve(
          new Response(body, {
            status: 200,
          }),
        );
      });

    const methodName = 'greet';
    const argValue = 'Name';

    const arg = IDL.encode([IDL.Text], [argValue]);

    const canisterId = Principal.fromText('2chl6-4hpzw-vqaaa-aaaaa-c');
    const principal = await Principal.anonymous();
    const sender = principal.toUint8Array();

    const nonces = [
      new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7]) as Nonce,
      new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]) as Nonce,
      new Uint8Array([2, 3, 4, 5, 6, 7, 8, 9]) as Nonce,
      new Uint8Array([3, 4, 5, 6, 7, 8, 9, 0]) as Nonce,
      new Uint8Array([4, 5, 6, 7, 8, 9, 0, 1]) as Nonce,
    ];

    const expectedCallRequest = {
      content: {
        request_type: SubmitRequestType.Call,
        canister_id: canisterId,
        method_name: methodName,
        arg,
        nonce: nonces[0],
        sender,
        ingress_expiry: new Expiry(300000),
      },
    } as UnSigned<CallRequest>;

    const expectedCallRequestId = await requestIdOf(expectedCallRequest.content);

    let nonceCount = 0;

    const httpAgent = new HttpAgent({ fetch: mockFetch, disableNonce: true });
    httpAgent.addTransform(makeNonceTransform(() => nonces[nonceCount++]));

    const actor = Actor.createActor(actorInterface, { canisterId, agent: httpAgent });
    const reply = await actor.greet(argValue);

    expect(reply).toEqual(IDL.decode([IDL.Text], expectedReplyArg)[0]);

    const { calls } = mockFetch.mock;

    expect(calls.length).toBe(5);
    expect(calls[0]).toEqual([
      `http://localhost/api/v2/canister/${canisterId.toText()}/call`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/cbor',
        },
        body: cbor.encode(expectedCallRequest),
      },
    ]);

    expect(calls[1]).toEqual([
      `http://localhost/api/v2/canister/${canisterId.toText()}/read_state`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/cbor',
        },
        body: cbor.encode({
          content: {
            request_type: 'request_status',
            request_id: expectedCallRequestId,
            ingress_expiry: new Expiry(300000),
          },
        }),
      },
    ]);

    expect(calls[2][0]).toBe('http://localhost/api/v1/read');
    expect(calls[2][1]).toEqual({
      method: 'POST',
      headers: {
        'Content-Type': 'application/cbor',
      },
      body: cbor.encode({
        content: {
          request_type: 'request_status',
          request_id: expectedCallRequestId,
          ingress_expiry: new Expiry(300000),
        },
      }),
    });

    expect(calls[3][0]).toBe('http://localhost/api/v1/read');
    expect(calls[3][1]).toEqual({
      method: 'POST',
      headers: {
        'Content-Type': 'application/cbor',
      },
      body: cbor.encode({
        content: {
          request_type: 'request_status',
          request_id: expectedCallRequestId,
          ingress_expiry: new Expiry(300000),
        },
      }),
    });

    expect(calls[4][0]).toBe('http://localhost/api/v1/read');
    expect(calls[4][1]).toEqual({
      method: 'POST',
      headers: {
        'Content-Type': 'application/cbor',
      },
      body: cbor.encode({
        content: {
          request_type: 'request_status',
          request_id: expectedCallRequestId,
          ingress_expiry: new Expiry(300000),
        },
      }),
    });
  });
  it('should allow its agent to be invalidated', async () => {
    const mockFetch = jest.fn();
    const actorInterface = () => {
      return IDL.Service({
        greet: IDL.Func([IDL.Text], [IDL.Text]),
      });
    };
    const httpAgent = new HttpAgent({ fetch: mockFetch, host: 'http://localhost' });
    const canisterId = Principal.fromText('2chl6-4hpzw-vqaaa-aaaaa-c');
    const actor = Actor.createActor(actorInterface, { canisterId, agent: httpAgent });

    Actor.agentOf(actor).invalidateIdentity();

    try {
      await actor.greet('test');
    } catch (error) {
      expect(error.message).toBe(
        "This identity has expired due this application's security policy. Please refresh your authentication.",
      );
    }
  });
});

// TODO: tests for rejected, unknown time out
