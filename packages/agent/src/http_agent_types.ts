import { Expiry } from './http_agent_transforms';
import { Principal } from './principal';
import { RejectCode } from './reject_code';
import { RequestId } from './request_id';
import { BinaryBlob } from './types';

export const enum Endpoint {
  Read = 'read',
  Submit = 'submit',
  Status = 'status',
}

// An HttpAgent request, before it gets encoded and sent to the server.
// We create an empty request that we will fill later.
export type HttpAgentRequest = HttpAgentReadRequest | HttpAgentSubmitRequest;

export interface HttpAgentBaseRequest {
  readonly endpoint: Endpoint;
  request: RequestInit;
}

export interface HttpAgentSubmitRequest extends HttpAgentBaseRequest {
  readonly endpoint: Endpoint.Submit;
  body: SubmitRequest;
}

export interface HttpAgentReadRequest extends HttpAgentBaseRequest {
  readonly endpoint: Endpoint.Read;
  body: ReadRequest;
}

export type SignedHttpAgentRequest = SignedHttpAgentReadRequest | SignedHttpAgentSubmitRequest;

interface SignedHttpAgentSubmitRequest extends HttpAgentBaseRequest {
  readonly endpoint: Endpoint.Submit;
  body: Envelope<SubmitRequest>;
}

interface SignedHttpAgentReadRequest extends HttpAgentBaseRequest {
  readonly endpoint: Endpoint.Read;
  body: Envelope<ReadRequest>;
}

export interface Signed<T> {
  content: T;
  sender_pubkey: BinaryBlob;
  sender_sig: BinaryBlob;
}

export interface UnSigned<T> {
  content: T;
}

export type Envelope<T> = Signed<T> | UnSigned<T>;

export interface HttpAgentRequestTransformFn {
  (args: HttpAgentRequest): Promise<HttpAgentRequest | undefined | void>;
  priority?: number;
}

export type AuthHttpAgentRequestTransformFn = (
  args: HttpAgentRequest,
) => Promise<SignedHttpAgentRequest>;

export interface QueryFields {
  methodName: string;
  arg: BinaryBlob;
}
export interface ReadStateFields {
  paths: BinaryBlob[][];
}

export interface CallFields {
  methodName: string;
  arg: BinaryBlob;
}

// The fields in a "call" submit request.
// tslint:disable:camel-case
export interface CallRequest extends Record<string, any> {
  request_type: SubmitRequestType.Call;
  canister_id: Principal;
  method_name: string;
  arg: BinaryBlob;
  sender: BinaryBlob;
  ingress_expiry: Expiry;
}
export interface InstallCodeRequest extends Record<string, any> {
  request_type: SubmitRequestType.InstallCode;
  canister_id: Principal;
  module: BinaryBlob;
  arg?: BinaryBlob;
  sender: BinaryBlob;
  ingress_expiry: Expiry;
}
// tslint:enable:camel-case

// The types of values allowed in the `request_type` field for submit requests.
export enum SubmitRequestType {
  Call = 'call',
  InstallCode = 'install_code',
}

export type SubmitRequest = CallRequest | InstallCodeRequest;
export interface SubmitResponse {
  requestId: RequestId;
  response: {
    ok: boolean;
    status: number;
    statusText: string;
  };
}

// An ADT that represents responses to a "query" read request.
export type QueryResponse = QueryResponseReplied | QueryResponseRejected;

export interface QueryResponseBase {
  status: QueryResponseStatus;
}

export interface QueryResponseReplied extends QueryResponseBase {
  status: QueryResponseStatus.Replied;
  reply: { arg: BinaryBlob };
}

export interface QueryResponseRejected extends QueryResponseBase {
  status: QueryResponseStatus.Rejected;
  reject_code: RejectCode;
  reject_message: string;
}

export const enum QueryResponseStatus {
  Replied = 'replied',
  Rejected = 'rejected',
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
  arg: BinaryBlob;
  sender: BinaryBlob;
  ingress_expiry: Expiry;
}

export interface ReadStateRequest extends Record<string, any> {
  request_type: ReadRequestType.ReadState;
  paths: BinaryBlob[][];
  ingress_expiry: Expiry;
  sender: BinaryBlob;
}

export interface ReadStateResponse {
  certificate: BinaryBlob;
}

export enum RequestStatusResponseStatus {
  Received = 'received',
  Processing = 'processing',
  Replied = 'replied',
  Rejected = 'rejected',
  Unknown = 'unknown',
  Done = 'done',
}

export type ReadRequest = QueryRequest | ReadStateRequest;
export type ReadResponse = QueryResponse | ReadStateResponse;
