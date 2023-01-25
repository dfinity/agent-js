import {
  CallOptions,
  JsonObject,
  QueryFields,
  QueryResponse,
  ReadStateOptions,
  ReadStateResponse,
  SubmitResponse,
} from './agent';

export enum ProxyMessageKind {
  Error = 'err',
  GetPrincipal = 'gp',
  GetPrincipalResponse = 'gpr',
  Query = 'q',
  QueryResponse = 'qr',
  Call = 'c',
  CallResponse = 'cr',
  ReadState = 'rs',
  ReadStateResponse = 'rsr',
  Status = 's',
  StatusResponse = 'sr',
}

export interface ProxyMessageBase {
  id: number;
  type: ProxyMessageKind;
}

export interface ProxyMessageError extends ProxyMessageBase {
  type: ProxyMessageKind.Error;
  error: any;
}

export interface ProxyMessageGetPrincipal extends ProxyMessageBase {
  type: ProxyMessageKind.GetPrincipal;
}

export interface ProxyMessageGetPrincipalResponse extends ProxyMessageBase {
  type: ProxyMessageKind.GetPrincipalResponse;
  response: string;
}

export interface ProxyMessageQuery extends ProxyMessageBase {
  type: ProxyMessageKind.Query;
  args: [string, QueryFields];
}

export interface ProxyMessageQueryResponse extends ProxyMessageBase {
  type: ProxyMessageKind.QueryResponse;
  response: QueryResponse;
}

export interface ProxyMessageCall extends ProxyMessageBase {
  type: ProxyMessageKind.Call;
  args: [string, CallOptions];
}

export interface ProxyMessageCallResponse extends ProxyMessageBase {
  type: ProxyMessageKind.CallResponse;
  response: SubmitResponse;
}

export interface ProxyMessageReadState extends ProxyMessageBase {
  type: ProxyMessageKind.ReadState;
  args: [string, ReadStateOptions];
}

export interface ProxyMessageReadStateResponse extends ProxyMessageBase {
  type: ProxyMessageKind.ReadStateResponse;
  response: ReadStateResponse;
}

export interface ProxyMessageStatus extends ProxyMessageBase {
  type: ProxyMessageKind.Status;
}

export interface ProxyMessageStatusResponse extends ProxyMessageBase {
  type: ProxyMessageKind.StatusResponse;
  response: JsonObject;
}

export type ProxyMessage =
  | ProxyMessageError
  | ProxyMessageGetPrincipal
  | ProxyMessageGetPrincipalResponse
  | ProxyMessageQuery
  | ProxyMessageQueryResponse
  | ProxyMessageCall
  | ProxyMessageReadState
  | ProxyMessageReadStateResponse
  | ProxyMessageCallResponse
  | ProxyMessageStatus
  | ProxyMessageStatusResponse;
