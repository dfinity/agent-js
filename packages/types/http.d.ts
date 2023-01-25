// The fields in a "call" submit request.

import { Endpoint } from './agent';
import { AbstractPrincipal } from './principal';
import { AbstractExpiry } from './expiry';

// The types of values allowed in the `request_type` field for submit requests.
export enum SubmitRequestType {
  Call = 'call',
}

// tslint:disable:camel-case
export interface CallRequest extends Record<string, any> {
  request_type: SubmitRequestType.Call;
  canister_id: AbstractPrincipal;
  method_name: string;
  arg: ArrayBuffer;
  sender: Uint8Array | AbstractPrincipal;
  ingress_expiry: AbstractExpiry;
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

export interface HttpAgentBaseRequest {
  readonly endpoint: Endpoint;
  request: RequestInit;
}

export const enum ReadRequestType {
  Query = 'query',
  ReadState = 'read_state',
}

// The fields in a "query" read request.
export interface QueryRequest extends Record<string, any> {
  request_type: ReadRequestType.Query;
  canister_id: AbstractPrincipal;
  method_name: string;
  arg: ArrayBuffer;
  sender: Uint8Array | AbstractPrincipal;
  ingress_expiry: AbstractExpiry;
}

export interface ReadStateRequest extends Record<string, any> {
  request_type: ReadRequestType.ReadState;
  paths: ArrayBuffer[][];
  ingress_expiry: AbstractExpiry;
  sender: Uint8Array | AbstractPrincipal;
}

export type ReadRequest = QueryRequest | ReadStateRequest;

export type HttpAgentRequest =
  | HttpAgentQueryRequest
  | HttpAgentSubmitRequest
  | HttpAgentReadStateRequest;

export interface HttpAgentRequestTransformFn {
  (args: HttpAgentRequest): Promise<HttpAgentRequest | undefined | void>;
  priority?: number;
}
