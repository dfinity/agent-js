import express, { Express, Request, Response } from 'express';
import {
  CallRequest,
  Cbor,
  requestIdOf,
  SubmitRequestType,
  v3ResponseBody,
  calculateIngressExpiry,
  Cert,
  reconstruct,
  domain_sep,
  Nonce,
  RequestId,
  ReadStateResponse,
  HashTree,
  Signed,
  UnSigned,
  ReadStateRequest,
} from '@dfinity/icp/agent';
import { Principal } from '@dfinity/icp/principal';
import { Mock, vi } from 'vitest';
import { createReplyTree, createTimeTree } from './tree';
import { randomKeyPair, signBls, KeyPair } from './identity';
import { concatBytes } from '@noble/hashes/utils';

export enum MockReplicaSpyType {
  CallV3 = 'CallV3',
  ReadStateV2 = 'ReadStateV2',
}

export type MockReplicaRequest = Request<{ canisterId: string }, Uint8Array, Uint8Array>;
export type MockReplicaResponse = Response<Uint8Array | string>;

export type MockReplicaSpyImpl = (req: MockReplicaRequest, res: MockReplicaResponse) => void;
export type MockReplicaSpy = Mock<MockReplicaSpyImpl>;

export interface MockReplicaSpies {
  [MockReplicaSpyType.CallV3]?: MockReplicaSpy;
  [MockReplicaSpyType.ReadStateV2]?: MockReplicaSpy;
}

export class MockReplica {
  readonly #listeners: Map<string, MockReplicaSpies> = new Map();

  private constructor(
    app: Express,
    public readonly address: string,
  ) {
    app.use(express.raw({ type: 'application/cbor' }));
    app.post(
      '/api/v3/canister/:canisterId/call',
      this.#createEndpointSpy(MockReplicaSpyType.CallV3),
    );
    app.post(
      '/api/v2/canister/:canisterId/read_state',
      this.#createEndpointSpy(MockReplicaSpyType.ReadStateV2),
    );
  }

  public static async create(): Promise<MockReplica> {
    const app = express();

    return new Promise(resolve => {
      const server = app.listen(0, 'localhost', () => {
        const address = server.address();
        if (address === null) {
          throw new Error('Failed to get server address.');
        }

        const strAddress =
          typeof address === 'string' ? address : `http://localhost:${address.port}`;

        const mockReplica = new MockReplica(app, strAddress);
        resolve(mockReplica);
      });
    });
  }

  public setV3CallSpyImplOnce(canisterId: string, impl: MockReplicaSpyImpl): void {
    this.#setSpyImplOnce(canisterId, MockReplicaSpyType.CallV3, impl);
  }

  public setV2ReadStateSpyImplOnce(canisterId: string, impl: MockReplicaSpyImpl): void {
    this.#setSpyImplOnce(canisterId, MockReplicaSpyType.ReadStateV2, impl);
  }

  public getV3CallSpy(canisterId: string): MockReplicaSpy {
    return this.#getSpy(canisterId, MockReplicaSpyType.CallV3);
  }

  public getV2ReadStateSpy(canisterId: string): MockReplicaSpy {
    return this.#getSpy(canisterId, MockReplicaSpyType.ReadStateV2);
  }

  public getV3CallReq(canisterId: string, callNumber: number): Signed<CallRequest> {
    const [req] = this.#getCallParams(canisterId, callNumber, MockReplicaSpyType.CallV3);

    return Cbor.decode<Signed<CallRequest>>(req.body);
  }

  public getV2ReadStateReq(canisterId: string, callNumber: number): UnSigned<ReadStateRequest> {
    const [req] = this.#getCallParams(canisterId, callNumber, MockReplicaSpyType.ReadStateV2);

    return Cbor.decode<UnSigned<ReadStateRequest>>(req.body);
  }

  #createEndpointSpy(spyType: MockReplicaSpyType): MockReplicaSpyImpl {
    return (req, res) => {
      const { canisterId } = req.params;

      const canisterSpies = this.#listeners.get(canisterId);
      if (!canisterSpies) {
        res.status(500).send(`No listeners defined for canisterId: ${canisterId}.`);
        return;
      }

      const spy = canisterSpies[spyType];
      if (!spy) {
        res.status(500).send(`No ${spyType} spy defined for canisterId: ${canisterId}.`);
        return;
      }

      spy(req, res);
    };
  }

  #setSpyImplOnce(canisterId: string, spyType: MockReplicaSpyType, impl: MockReplicaSpyImpl): void {
    const map: MockReplicaSpies = this.#listeners.get(canisterId.toString()) ?? {};
    const spy = map[spyType] ?? vi.fn();

    spy.mockImplementationOnce(impl);

    map[spyType] = spy;
    this.#listeners.set(canisterId.toString(), map);
  }

  #getSpy(canisterId: string, spyType: MockReplicaSpyType): MockReplicaSpy {
    const canisterSpies = this.#listeners.get(canisterId);
    if (!canisterSpies) {
      throw new Error(`No listeners defined for canisterId: ${canisterId}.`);
    }

    const spy = canisterSpies[spyType];
    if (!spy) {
      throw new Error(`No ${spyType} spy defined for canisterId: ${canisterId}.`);
    }

    return spy;
  }

  #getCallParams(
    canisterId: string,
    callNumber: number,
    spyType: MockReplicaSpyType,
  ): [MockReplicaRequest, MockReplicaResponse] {
    const spy = this.#getSpy(canisterId, spyType);
    if (!spy.mock.calls.length) {
      throw new Error(`No calls found for canisterId: ${canisterId}.`);
    }

    const callParams = spy.mock.calls[callNumber];
    if (!callParams) {
      throw new Error(
        `No call params found for canisterId: ${canisterId}, callNumber: ${callNumber}. Actual number of calls is ${spy.mock.calls.length}.`,
      );
    }
    if (!callParams[0]) {
      throw new Error(`No request found for canisterId: ${canisterId}, callNumber: ${callNumber}.`);
    }
    if (!callParams[1]) {
      throw new Error(
        `No response found for canisterId: ${canisterId}, callNumber: ${callNumber}.`,
      );
    }

    return callParams;
  }
}

interface V3ResponseOptions {
  canisterId: Principal | string;
  methodName: string;
  arg: Uint8Array;
  sender: Principal | string;
  ingressExpiryInMinutes?: number;
  timeDiffMsecs?: number;
  reply?: string | Uint8Array;
  keyPair?: KeyPair;
  date?: Date;
  nonce?: Nonce;
}

interface V3Response {
  responseBody: Uint8Array;
  requestId: RequestId;
}

/**
 * Prepares a version 3 response for a canister call.
 * @param {V3ResponseOptions} options - The options for preparing the response.
 * @param {string} options.canisterId - The ID of the canister.
 * @param {string} options.methodName - The name of the method being called.
 * @param {Uint8Array} options.arg - The arguments for the method call.
 * @param {string} options.sender - The principal ID of the sender.
 * @param {number} options.ingressExpiryInMinutes - The ingress expiry time in minutes.
 * @param {number} options.timeDiffMsecs - The time difference in milliseconds.
 * @param {Uint8Array} options.reply - The reply payload.
 * @param {KeyPair} options.keyPair - The key pair for signing.
 * @param {Date} options.date - The date of the request.
 * @param {Uint8Array} options.nonce - The nonce for the request.
 * @returns {Promise<V3Response>} A promise that resolves to the prepared response.
 */
export async function prepareV3Response({
  canisterId,
  methodName,
  arg,
  sender,
  ingressExpiryInMinutes,
  timeDiffMsecs,
  reply,
  keyPair,
  date,
  nonce,
}: V3ResponseOptions): Promise<V3Response> {
  canisterId = Principal.from(canisterId);
  sender = Principal.from(sender);
  ingressExpiryInMinutes = ingressExpiryInMinutes ?? 5;
  timeDiffMsecs = timeDiffMsecs ?? 0;
  reply = reply ?? new Uint8Array();
  keyPair = keyPair ?? randomKeyPair();
  date = date ?? new Date();

  const ingressExpiry = calculateIngressExpiry(ingressExpiryInMinutes, timeDiffMsecs);
  const callRequest: CallRequest = {
    request_type: SubmitRequestType.Call,
    canister_id: canisterId,
    method_name: methodName,
    arg,
    sender,
    ingress_expiry: ingressExpiry,
    nonce,
  };
  const requestId = requestIdOf(callRequest);

  const tree = createReplyTree({
    requestId,
    reply,
    date,
  });
  const signature = await signTree(tree, keyPair);

  const cert: Cert = {
    tree,
    signature,
  };
  const responseBody: v3ResponseBody = {
    certificate: Cbor.encode(cert),
  };

  return {
    responseBody: new Uint8Array(Cbor.encode(responseBody)),
    requestId,
  };
}

export interface V2ReadStateTimeOptions {
  keyPair?: KeyPair;
  date?: Date;
}

export interface V2ReadStateResponse {
  responseBody: Uint8Array;
}

/**
 * Prepares a version 2 read state time response.
 * @param {V2ReadStateTimeOptions} options - The options for preparing the response.
 * @param {Date} options.date - The date for the response.
 * @param {KeyPair} options.keyPair - The key pair for signing.
 * @returns {Promise<V2ReadStateResponse>} A promise that resolves to the prepared response.
 */
export async function prepareV2ReadStateTimeResponse({
  date,
  keyPair,
}: V2ReadStateTimeOptions): Promise<V2ReadStateResponse> {
  keyPair = keyPair ?? randomKeyPair();
  date = date ?? new Date();

  const tree = createTimeTree(date);
  const signature = await signTree(tree, keyPair);

  const cert: Cert = {
    tree,
    signature,
  };
  const responseBody: ReadStateResponse = {
    certificate: Cbor.encode(cert),
  };

  return {
    responseBody: new Uint8Array(Cbor.encode(responseBody)),
  };
}

async function signTree(tree: HashTree, keyPair: KeyPair): Promise<Uint8Array> {
  const rootHash = await reconstruct(tree);
  const msg = concatBytes(domain_sep('ic-state-root'), rootHash);
  return signBls(msg, keyPair.privateKey);
}
