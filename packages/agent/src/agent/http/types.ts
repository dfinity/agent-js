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
  const value = BigInt(+Date.now()) * BigInt(100000) + BigInt(Math.floor(Math.random() * 100000));
  view.setBigUint64(0, value);
  // tslint:disable-next-line:no-bitwise
  view.setBigUint64(1, value >> BigInt(64));

  return buffer as Nonce;
}
