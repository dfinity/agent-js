import { Principal } from '@dfinity/principal';
import { IDL } from '@dfinity/candid';
import { RequestId } from '../request_id';
import { ReadStateRequest, ReadRequestType } from '../agent/http/types';
import { V3Agent, V2Agent } from '../agent/api';
import { RequestStatusResponseStatus } from '../agent';
import { Actor } from '../actor';

jest.mock('../certificate', () => {
  const originalModule = jest.requireActual('../certificate');
  return {
    ...originalModule,
    Certificate: {
      create: jest.fn().mockResolvedValue({
        cert: {
          tree: {},
          signature: new Uint8Array(0),
        },
        lookup: jest.fn().mockImplementation(path => {
          if (path.includes('status')) {
            return new TextEncoder().encode(RequestStatusResponseStatus.Replied);
          }
          if (path.includes('reply')) {
            return new Uint8Array(5);
          }
          return undefined;
        }),
        verify: jest.fn().mockImplementation(() => true),
      }),
    },
  };
});
import { pollForResponse } from './index';
describe('pollForResponse with different agent types', () => {
  const canisterId = Principal.fromText('rrkah-fqaaa-aaaaa-aaaaq-cai');
  const requestId = new Uint8Array(10) as unknown as RequestId;
  const mockCertificate = new Uint8Array(10);
  const mockReadStateResponse = {
    certificate: mockCertificate,
  };

  // Mock certificate for all tests
  beforeEach(() => {
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  test('readStateSigned with V3Agent when reuseReadStateSignatures=true', async () => {
    // Create a mock V3 agent with readStateSigned and readStateUnsigned
    const mockV3Agent = {
      rootKey: new Uint8Array(10),
      readStateSigned: jest.fn().mockResolvedValue(mockReadStateResponse),
      readStateUnsigned: jest.fn().mockResolvedValue(mockReadStateResponse),
      createReadStateRequest: jest.fn().mockResolvedValue({
        body: {
          content: {
            request_type: ReadRequestType.ReadState,
            ingress_expiry: {
              toCBOR: () => new Uint8Array(),
              toHash: () => new Uint8Array(),
            },
          },
        },
      }),
    } as unknown as V3Agent;

    // Execute pollForResponse with reuseReadStateSignatures=true
    await pollForResponse(mockV3Agent, canisterId, requestId, {
      reuseReadStateSignatures: true,
    });

    // Verify readStateSigned was called and readStateUnsigned was not
    expect(mockV3Agent.readStateSigned).toHaveBeenCalledTimes(1);
    expect(mockV3Agent.readStateUnsigned).not.toHaveBeenCalled();
  });

  test('readStateUnsigned with V3Agent when reuseReadStateSignatures=false', async () => {
    // Create a mock V3 agent with readStateSigned and readStateUnsigned
    const mockV3Agent = {
      rootKey: new Uint8Array(10),
      readStateSigned: jest.fn().mockResolvedValue(mockReadStateResponse),
      readStateUnsigned: jest.fn().mockResolvedValue(mockReadStateResponse),
      createReadStateRequest: jest.fn().mockResolvedValue({
        body: {
          content: {
            request_type: ReadRequestType.ReadState,
            ingress_expiry: {
              toCBOR: () => new Uint8Array(),
              toHash: () => new Uint8Array(),
            },
          },
        },
      }),
    } as unknown as V3Agent;

    // Execute pollForResponse with reuseReadStateSignatures=false
    await pollForResponse(mockV3Agent, canisterId, requestId, {
      reuseReadStateSignatures: false,
    });

    // Verify readStateSigned was not called and readStateUnsigned was
    expect(mockV3Agent.readStateSigned).not.toHaveBeenCalled();
    expect(mockV3Agent.readStateUnsigned).toHaveBeenCalledTimes(1);
  });

  test('readState with V2Agent regardless of reuseReadStateSignatures', async () => {
    // Create a mock V2 agent with just readState
    const mockV2Agent = {
      rootKey: new Uint8Array(10),
      readState: jest.fn().mockResolvedValue(mockReadStateResponse),
    } as unknown as V2Agent;

    // Execute pollForResponse with reuseReadStateSignatures=true
    await pollForResponse(mockV2Agent, canisterId, requestId, {
      reuseReadStateSignatures: true,
    });

    // Verify readState was called
    expect(mockV2Agent.readState).toHaveBeenCalledTimes(1);
  });
});

describe('Actor integration with polling options', () => {
  const canisterId = Principal.fromText('rrkah-fqaaa-aaaaa-aaaaq-cai');
  const mockCertificate = new Uint8Array(10);
  const mockReply = new Uint8Array(5);

  // Prepare a simple IDL service for testing
  const idlFactory = () => {
    return IDL.Service({
      update_method: IDL.Func([IDL.Text], [IDL.Text], []),
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();

    jest.doMock('../certificate', () => {
      const originalModule = jest.requireActual('../certificate');
      return {
        ...originalModule,
        Certificate: {
          create: jest.fn().mockResolvedValue({
            cert: {
              tree: {},
              signature: new Uint8Array(0),
            },
            lookup: jest.fn().mockImplementation(path => {
              if (path.includes('status')) {
                return new TextEncoder().encode(RequestStatusResponseStatus.Replied);
              }
              if (path.includes('reply')) {
                return mockReply;
              }
              return undefined;
            }),
          }),
        },
        lookupResultToBuffer: jest.fn().mockReturnValue(mockReply),
      };
    });
  });

  test('readStateSigned when reuseReadStateSignatures=true in actor config', async () => {
    // Mock V3 agent for the actor
    const mockV3Agent = {
      rootKey: new Uint8Array(10),
      readStateSigned: jest.fn().mockResolvedValue({
        certificate: mockCertificate,
      }),
      readStateUnsigned: jest.fn(),
      call: jest.fn().mockResolvedValue({
        requestId: new Uint8Array(10) as unknown as RequestId,
        response: {
          status: 202, // Accepted, which should trigger polling
        },
      }),
      createReadStateRequest: jest.fn().mockResolvedValue({
        body: {
          content: {
            request_type: ReadRequestType.ReadState,
            ingress_expiry: {
              toCBOR: () => new Uint8Array(),
              toHash: () => new Uint8Array(),
            },
          },
        },
      }),
    } as unknown as V3Agent;

    // Create actor with reuseReadStateSignatures = true
    const actor = Actor.createActor(idlFactory, {
      canisterId: canisterId,
      agent: mockV3Agent,
      pollingOptions: {
        reuseReadStateSignatures: true,
      },
    });

    // Call an update method which should trigger polling
    await actor.update_method('test');

    // Verify readStateSigned was called
    expect(mockV3Agent.readStateSigned).toHaveBeenCalled();
    expect(mockV3Agent.readStateUnsigned).not.toHaveBeenCalled();
  });

  test('readStateUnsigned when reuseReadStateSignatures=false in actor config', async () => {
    // Mock V3 agent for the actor
    const mockV3Agent = {
      rootKey: new Uint8Array(10),
      readStateSigned: jest.fn(),
      readStateUnsigned: jest.fn().mockResolvedValue({
        certificate: mockCertificate,
      }),
      call: jest.fn().mockResolvedValue({
        requestId: new Uint8Array(10) as unknown as RequestId,
        response: {
          status: 202, // Accepted, which should trigger polling
        },
      }),
    } as unknown as V3Agent;

    // Create actor with reuseReadStateSignatures = false
    const actor = Actor.createActor(idlFactory, {
      canisterId: canisterId,
      agent: mockV3Agent,
      pollingOptions: {
        reuseReadStateSignatures: false,
      },
    });

    // Call an update method which should trigger polling
    await actor.update_method('test');

    // Verify readStateUnsigned was called
    expect(mockV3Agent.readStateSigned).not.toHaveBeenCalled();
    expect(mockV3Agent.readStateUnsigned).toHaveBeenCalled();
  });

  test('provides signed request to subsequent calls when reusing signatures', async () => {
    // Mock for checking if the same request is reused
    let capturedRequest: ReadStateRequest | undefined;
    let statusCallCount = 0;

    jest.doMock('../certificate', () => {
      const originalModule = jest.requireActual('../certificate');
      return {
        ...originalModule,
        Certificate: {
          create: jest.fn().mockResolvedValue({
            cert: {
              tree: {},
              signature: new Uint8Array(0),
            },
            lookup: jest.fn().mockImplementation(path => {
              if (path.includes('status')) {
                if (statusCallCount++ === 0) {
                  return new TextEncoder().encode(RequestStatusResponseStatus.Processing);
                }
                return new TextEncoder().encode(RequestStatusResponseStatus.Replied);
              }
              if (path.includes('reply')) {
                return mockReply;
              }
              return undefined;
            }),
            verify: jest.fn().mockImplementation(() => true),
          }),
        },
      };
    });

    // Mock V3 agent for the actor
    const mockV3Agent = {
      rootKey: new Uint8Array(10),
      readStateSigned: jest.fn().mockImplementation((_, __, request) => {
        capturedRequest = request;
        return Promise.resolve({ certificate: mockCertificate });
      }),
      readStateUnsigned: jest.fn(),
      call: jest.fn().mockResolvedValue({
        requestId: new Uint8Array(10) as unknown as RequestId,
        response: {
          status: 202, // Accepted, which should trigger polling
        },
      }),
      createReadStateRequest: jest.fn().mockResolvedValue({
        body: {
          content: {
            request_type: ReadRequestType.ReadState,
            ingress_expiry: {
              toCBOR: () => new Uint8Array(),
              toHash: () => new Uint8Array(),
            },
          },
        },
      }),
    } as unknown as V3Agent;

    // Create special strategy that resolves immediately for testing
    const instantStrategy = jest.fn().mockResolvedValue(undefined);

    // Execute pollForResponse directly with reuseReadStateSignatures=true
    await pollForResponse(mockV3Agent, canisterId, new Uint8Array(10) as unknown as RequestId, {
      reuseReadStateSignatures: true,
      strategy: instantStrategy,
    });

    // Verify readStateSigned was called twice (initial call + retry)
    expect(mockV3Agent.readStateSigned).toHaveBeenCalledTimes(2);

    // Verify same request was passed the second time
    expect(capturedRequest).not.toBeUndefined();
    expect(mockV3Agent.createReadStateRequest).toHaveBeenCalledTimes(1);
  });
});
