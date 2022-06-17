import type { Principal } from '@dfinity/principal';
import { Expiry } from './transforms';
import { lebEncode } from '@dfinity/candid';

/**
 * @internal
 */
export const enum Endpoint {
  Query = 'read',
  ReadState = 'read_state',
  Call = 'call',
}

// An HttpAgent request, before it gets encoded and sent to the server.
// We create an empty request that we will fill later.
export type HttpAgentRequest =
  | HttpAgentQueryRequest
  | HttpAgentSubmitRequest
  | HttpAgentReadStateRequest;

export interface HttpAgentBaseRequest {
  readonly endpoint: Endpoint;
  request: RequestInit;
}

export interface HttpAgentSubmitRequest extends HttpAgentBaseRequest {
  readonly endpoint: Endpoint.Call;
  body: CallRequest;
}

export interface HttpAgentQueryRequest extends HttpAgentBaseRequest {
  readonly endpoint: Endpoint.Query;
  body: ReadRequest;
}

export interface HttpAgentReadStateRequest extends HttpAgentBaseRequest {
  readonly endpoint: Endpoint.ReadState;
  body: ReadRequest;
}

export interface Signed<T> {
  content: T;
  sender_pubkey: ArrayBuffer;
  sender_sig: ArrayBuffer;
}

export interface UnSigned<T> {
  content: T;
}

export type Envelope<T> = Signed<T> | UnSigned<T>;

export interface HttpAgentRequestTransformFn {
  (args: HttpAgentRequest): Promise<HttpAgentRequest | undefined | void>;
  priority?: number;
}

// The fields in a "call" submit request.
// tslint:disable:camel-case
export interface CallRequest extends Record<string, any> {
  request_type: SubmitRequestType.Call;
  canister_id: Principal;
  method_name: string;
  arg: ArrayBuffer;
  sender: Uint8Array | Principal;
  ingress_expiry: Expiry;
}
// tslint:enable:camel-case

// The types of values allowed in the `request_type` field for submit requests.
export enum SubmitRequestType {
  Call = 'call',
}

// The types of values allowed in the `request_type` field for read requests.
export const enum ReadRequestType {
  Query = 'query',
  ReadState = 'read_state',
}

// The fields in a "query" read request.
export interface QueryRequest extends Record<string, any> {
  request_type: ReadRequestType.Query;
  canister_id: Principal;
  method_name: string;
  arg: ArrayBuffer;
  sender: Uint8Array | Principal;
  ingress_expiry: Expiry;
}

export interface ReadStateRequest extends Record<string, any> {
  request_type: ReadRequestType.ReadState;
  paths: ArrayBuffer[][];
  ingress_expiry: Expiry;
  sender: Uint8Array | Principal;
}

export type ReadRequest = QueryRequest | ReadStateRequest;

// A Nonce that can be used for calls.
export type Nonce = Uint8Array & { __nonce__: void };

/**
 * Create a random Nonce, based on date and a random suffix.
 */
export function makeNonce(): Nonce {
  // Encode 128 bits.
  const buffer = new ArrayBuffer(16);
  const view = new DataView(buffer);
  const now = BigInt(+Date.now());
  const randHi = Math.floor(Math.random() * 0xffffffff);
  const randLo = Math.floor(Math.random() * 0xffffffff);
  // Fix for IOS < 14.8 setBigUint64 absence
  if (typeof view.setBigUint64 === 'function') {
    view.setBigUint64(0, now);
  } else {
    const TWO_TO_THE_32 = BigInt(1) << BigInt(32);
    view.setUint32(0, Number(now >> BigInt(32)));
    view.setUint32(4, Number(now % TWO_TO_THE_32));
  }
  view.setUint32(8, randHi);
  view.setUint32(12, randLo);

  return buffer as Nonce;
}
