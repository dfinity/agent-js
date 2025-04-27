import { IDL } from '@dfinity/candid';
import { Principal } from '@dfinity/principal';
import { HttpAgent, Nonce, SubmitResponse } from './agent';
import { Expiry } from './agent/http/transforms';
import { CallRequest, SubmitRequestType, UnSigned } from './agent/http/types';
import * as cbor from './cbor';
import { requestIdOf } from './request_id';
import * as pollingImport from './polling';
import { ActorConfig } from './actor';
import { CertifiedRejectErrorCode, RejectError, UnexpectedErrorCode, UnknownError } from './errors';

const importActor = async (mockUpdatePolling?: () => void) => {
  jest.dontMock('./polling');
  mockUpdatePolling?.();

  return await import('./actor');
};

const originalDateNowFn = global.Date.now;
beforeEach(() => {
  jest.resetModules();
  global.Date.now = jest.fn(() => new Date(1000000).getTime());
});
afterEach(() => {
  global.Date.now = originalDateNowFn;
});

describe('makeActor', () => {
  // TODO: update tests to be compatible with changes to Certificate
  it.skip('should encode calls', async () => {
    const { Actor } = await importActor();
    const actorInterface = () => {
      return IDL.Service({
        greet: IDL.Func([IDL.Text], [IDL.Text]),
      });
    };

    const expectedReplyArg = IDL.encode([IDL.Text], ['Hello, World!']);

    const mockFetch: jest.Mock = jest
      .fn()
      .mockImplementationOnce(() => {
        return Promise.resolve(
          new Response(null, {
            status: 202,
          }),
        );
      })
      .mockImplementationOnce(() => {
        const body = cbor.encode({ status: 'received' });
        return Promise.resolve(
          new Response(body, {
            status: 200,
          }),
        );
      })
      .mockImplementationOnce(() => {
        const body = cbor.encode({ status: 'processing' });
        return Promise.resolve(
          new Response(body, {
            status: 200,
          }),
        );
      })
      .mockImplementationOnce(() => {
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
      })
      .mockImplementationOnce(() => {
        // IC-1462 update call error
        const body = cbor.encode(<SubmitResponse['response']['body']>{
          error_code: 'IC0503',
          reject_code: 5,
          reject_message:
            'Canister (...) trapped explicitly: canister_inspect_message explicitly refused message',
        });
        return Promise.resolve(
          new Response(body, {
            status: 200,
          }),
        );
      });

    const methodName = 'greet';
    const errorMethodName = 'error';
    const argValue = 'Name';

    const arg = IDL.encode([IDL.Text], [argValue]);

    const canisterId = Principal.fromText('2chl6-4hpzw-vqaaa-aaaaa-c');
    const principal = Principal.anonymous();
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

    const expectedErrorCallRequest = {
      content: {
        request_type: SubmitRequestType.Call,
        canister_id: canisterId,
        method_name: errorMethodName,
        arg,
        nonce: nonces[0],
        sender,
        ingress_expiry: new Expiry(300000),
      },
    } as UnSigned<CallRequest>;

    const expectedCallRequestId = requestIdOf(expectedCallRequest.content);

    const httpAgent = new HttpAgent({ fetch: mockFetch });

    const actor = Actor.createActor(actorInterface, { canisterId, agent: httpAgent });
    const reply = await actor.greet(argValue);

    expect.assertions(13);

    expect(reply).toEqual(IDL.decode([IDL.Text], expectedReplyArg)[0]);

    try {
      await actor.error();
    } catch (error) {
      expect(error).toBeInstanceOf(RejectError);
      expect(error.cause.code).toBeInstanceOf(CertifiedRejectErrorCode);
    }

    const { calls } = mockFetch.mock;

    expect(calls.length).toBe(5);
    expect(calls[0]).toEqual([
      `http://127.0.0.1/api/v2/canister/${canisterId.toText()}/call`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/cbor',
        },
        body: cbor.encode(expectedCallRequest),
      },
    ]);

    expect(calls[1]).toEqual([
      `http://127.0.0.1/api/v2/canister/${canisterId.toText()}/read_state`,
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

    expect(calls[2][0]).toBe('http://127.0.0.1/api/v1/read');
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

    expect(calls[3][0]).toBe('http://127.0.0.1/api/v1/read');
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

    expect(calls[4][0]).toBe('http://127.0.0.1/api/v1/read');
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

    expect(calls[5][0]).toBe('http://127.0.0.1/api/v1/call');
    expect(calls[5][1]).toEqual({
      method: 'POST',
      headers: {
        'Content-Type': 'application/cbor',
      },
      body: cbor.encode(expectedErrorCallRequest),
    });
  });
  it('should enrich actor interface with httpDetails', async () => {
    const canisterDecodedReturnValue = 'Hello, World!';
    const expectedReplyArg = IDL.encode([IDL.Text], [canisterDecodedReturnValue]);
    const { Actor } = await importActor(() =>
      jest.doMock('./polling', () => ({
        ...pollingImport,
        pollForResponse: jest.fn(async () => {
          return { certificate: undefined, reply: expectedReplyArg };
        }),
      })),
    );

    const mockFetch = jest.fn(resource => {
      if (resource.endsWith('/call')) {
        return Promise.resolve(
          new Response(null, {
            status: 202,
            statusText: 'accepted',
          }),
        );
      }

      return Promise.resolve(
        new Response(
          cbor.encode({
            status: 'replied',
            reply: {
              arg: expectedReplyArg,
            },
          }),
          {
            status: 200,
            statusText: 'ok',
          },
        ),
      );
    });

    const actorInterface = () => {
      return IDL.Service({
        greet: IDL.Func([IDL.Text], [IDL.Text], ['query']),
        greet_update: IDL.Func([IDL.Text], [IDL.Text]),
        // todo: add method to test update call after Certificate changes have been adjusted
      });
    };
    const httpAgent = new HttpAgent({
      fetch: mockFetch,
      host: 'http://127.0.0.1',
      verifyQuerySignatures: false,
    });
    const canisterId = Principal.fromText('2chl6-4hpzw-vqaaa-aaaaa-c');
    const actor = Actor.createActor(actorInterface, { canisterId, agent: httpAgent });
    const actorWithHttpDetails = Actor.createActorWithHttpDetails(actorInterface, {
      canisterId,
      agent: httpAgent,
    });

    const reply = await actor.greet('test');
    const replyUpdate = await actor.greet_update('test');
    const replyWithHttpDetails = await actorWithHttpDetails.greet('test');
    const replyUpdateWithHttpDetails = await actorWithHttpDetails.greet_update('test');

    expect(reply).toEqual(canisterDecodedReturnValue);
    expect(replyUpdate).toEqual(canisterDecodedReturnValue);
    expect(replyWithHttpDetails.result).toEqual(canisterDecodedReturnValue);
    expect(replyWithHttpDetails.httpDetails).toMatchInlineSnapshot(`
      {
        "headers": [],
        "ok": true,
        "requestDetails": {
          "arg": Uint8Array [
            68,
            73,
            68,
            76,
            0,
            1,
            113,
            4,
            116,
            101,
            115,
            116,
          ],
          "canister_id": {
            "__principal__": "2chl6-4hpzw-vqaaa-aaaaa-c",
          },
          "ingress_expiry": "1200000000000",
          "method_name": "greet",
          "request_type": "query",
          "sender": {
            "__principal__": "2vxsx-fae",
          },
        },
        "status": 200,
        "statusText": "ok",
      }
    `);
    expect(replyUpdateWithHttpDetails.result).toEqual(canisterDecodedReturnValue);

    replyUpdateWithHttpDetails.httpDetails['requestDetails']['nonce'] = new Uint8Array();

    expect(replyUpdateWithHttpDetails.httpDetails).toMatchSnapshot();
  });
  it('should allow its agent to be invalidated', async () => {
    const { Actor } = await importActor();
    const mockFetch = jest.fn();
    const actorInterface = () => {
      return IDL.Service({
        greet: IDL.Func([IDL.Text], [IDL.Text]),
      });
    };
    const httpAgent = new HttpAgent({ fetch: mockFetch, host: 'http://127.0.0.1' });
    const canisterId = Principal.fromText('2chl6-4hpzw-vqaaa-aaaaa-c');
    const actor = Actor.createActor(actorInterface, { canisterId, agent: httpAgent });

    httpAgent.invalidateIdentity();

    try {
      await actor.greet('test');
    } catch (error) {
      expect((error as Error).message).toBe(
        "This identity has expired due this application's security policy. Please refresh your authentication.",
      );
    }
  });
  it('should throw a helpful error if the canisterId is not set', async () => {
    const httpAgent = new HttpAgent({ host: 'http://127.0.0.1' });
    const actorInterface = () => {
      return IDL.Service({
        greet: IDL.Func([IDL.Text], [IDL.Text]),
      });
    };
    const { Actor } = await importActor();
    const config = { agent: httpAgent } as unknown as ActorConfig;
    expect(() => Actor.createActor(actorInterface, config)).toThrowError(
      'Canister ID is required, but received undefined instead. If you are using automatically generated declarations, this may be because your application is not setting the canister ID in process.env correctly.',
    );
  });
  it('should properly handle preSignReadStateRequest option', async () => {
    // Mock response value
    const canisterDecodedReturnValue = 'Hello, World!';
    const expectedReplyArg = IDL.encode([IDL.Text], [canisterDecodedReturnValue]);

    // Mock the polling module with a spy to track calls
    const mockPollForResponse = jest.fn(async () => {
      return { certificate: undefined, reply: expectedReplyArg };
    });

    // Import actor with mocked polling
    const { Actor } = await importActor(() =>
      jest.doMock('./polling', () => ({
        ...pollingImport,
        pollForResponse: mockPollForResponse,
      })),
    );

    // Create a simple actor interface
    const actorInterface = () => {
      return IDL.Service({
        greet: IDL.Func([IDL.Text], [IDL.Text]),
      });
    };

    // Mock the fetch implementation for the call
    const mockFetch = jest.fn(() => {
      return Promise.resolve(
        new Response(null, {
          status: 202,
          statusText: 'accepted',
        }),
      );
    });

    const canisterId = Principal.fromText('2chl6-4hpzw-vqaaa-aaaaa-c');
    const httpAgent = new HttpAgent({ fetch: mockFetch });

    // Create actor with preSignReadStateRequest enabled
    const actor = Actor.createActor(actorInterface, {
      canisterId,
      agent: httpAgent,
      pollingOptions: {
        preSignReadStateRequest: true,
      },
    });

    // Make the call
    const reply = await actor.greet('Name');

    // Verify the result is as expected
    expect(reply).toEqual(canisterDecodedReturnValue);

    // Verify pollForResponse was called with preSignReadStateRequest option
    expect(mockPollForResponse).toHaveBeenCalledTimes(1);
    expect(mockPollForResponse.mock.calls.length).toBeGreaterThan(0);

    // Use any to handle the mock call structure
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const callArgs = mockPollForResponse.mock.calls[0] as any[];
    // Options should be the 4th argument (index 3)
    if (callArgs.length > 3) {
      const pollOptions = callArgs[3];
      expect(pollOptions.preSignReadStateRequest).toBe(true);
    } else {
      fail('pollOptions was not passed to pollForResponse');
    }
  });

  it('should allow method-specific pollingOptions override with withOptions', async () => {
    // Mock response value
    const canisterDecodedReturnValue = 'Hello, World!';
    const expectedReplyArg = IDL.encode([IDL.Text], [canisterDecodedReturnValue]);

    // Mock the polling module with a spy to track calls
    const mockPollForResponse = jest.fn(async () => {
      return { certificate: undefined, reply: expectedReplyArg };
    });

    // Import actor with mocked polling
    const { Actor } = await importActor(() =>
      jest.doMock('./polling', () => ({
        ...pollingImport,
        pollForResponse: mockPollForResponse,
      })),
    );

    // Create a simple actor interface
    const actorInterface = () => {
      return IDL.Service({
        greet: IDL.Func([IDL.Text], [IDL.Text]),
      });
    };

    // Mock the fetch implementation for the call
    const mockFetch = jest.fn(() => {
      return Promise.resolve(
        new Response(null, {
          status: 202,
          statusText: 'accepted',
        }),
      );
    });

    const canisterId = Principal.fromText('2chl6-4hpzw-vqaaa-aaaaa-c');
    const httpAgent = new HttpAgent({ fetch: mockFetch });

    // Create actor without preSignReadStateRequest at actor level
    const actor = Actor.createActor(actorInterface, {
      canisterId,
      agent: httpAgent,
    });

    // Custom polling strategy
    const customStrategy = jest.fn(() => Promise.resolve());

    // Call with method-specific options
    const reply = await actor.greet.withOptions({
      pollingOptions: {
        preSignReadStateRequest: true,
        strategy: customStrategy,
      },
    })('Name');

    // Verify the result is as expected
    expect(reply).toEqual(canisterDecodedReturnValue);

    // Verify pollForResponse was called with the right options
    expect(mockPollForResponse).toHaveBeenCalledTimes(1);
    expect(mockPollForResponse.mock.calls.length).toBeGreaterThan(0);

    // Use any to handle the mock call structure
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const callArgs = mockPollForResponse.mock.calls[0] as any[];
    // Options should be the 4th argument (index 3)
    if (callArgs.length > 3) {
      const pollOptions = callArgs[3];
      expect(pollOptions.preSignReadStateRequest).toBe(true);
      expect(pollOptions.strategy).toBe(customStrategy);
    } else {
      fail('pollOptions was not passed to pollForResponse');
    }
  });
});

test('it should preserve errors from call', async () => {
  const httpAgent = {
    call: () => {
      throw UnknownError.fromCode(new UnexpectedErrorCode('test error'));
    },
  };
  const actorInterface = () => {
    return IDL.Service({
      greet: IDL.Func([IDL.Text], [IDL.Text]),
    });
  };
  const { Actor } = await importActor();
  const canisterId: Principal = Principal.fromText('2chl6-4hpzw-vqaaa-aaaaa-c');
  const config = { agent: httpAgent, canisterId } as unknown as ActorConfig;
  const testActor = Actor.createActor(actorInterface, config);
  expect.assertions(2);
  try {
    await testActor.greet('foo');
  } catch (error) {
    expect(error).toBeInstanceOf(UnknownError);
    expect(error.cause.code).toBeInstanceOf(UnexpectedErrorCode);
  }
});

jest.setTimeout(20000);
