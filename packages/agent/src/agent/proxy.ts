import {
  ActorFactory,
  BinaryBlob,
  CallFields,
  JsonObject,
  Principal,
  QueryFields,
  QueryResponse,
  ReadStateFields,
  ReadStateResponse,
  SubmitResponse,
} from '..';
import * as actor from '../actor';
import * as IDL from '../idl';
import { Agent } from './api';

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
  response: string | null;
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
  args: [string, CallFields];
}

export interface ProxyMessageCallResponse extends ProxyMessageBase {
  type: ProxyMessageKind.CallResponse;
  response: SubmitResponse;
}

export interface ProxyMessageReadState extends ProxyMessageBase {
  type: ProxyMessageKind.ReadState;
  args: [ReadStateFields];
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

// A Stub Agent that forwards calls to another Agent implementation.
export class ProxyStubAgent {
  constructor(private _frontend: (msg: ProxyMessage) => void, private _agent: Agent) {}

  public onmessage(msg: ProxyMessage): void {
    switch (msg.type) {
      case ProxyMessageKind.GetPrincipal:
        this._agent.getPrincipal().then(response => {
          this._frontend({
            id: msg.id,
            type: ProxyMessageKind.GetPrincipalResponse,
            response: response ? response.toText() : null,
          });
        });
        break;
      case ProxyMessageKind.Query:
        this._agent.query(...msg.args).then(response => {
          this._frontend({
            id: msg.id,
            type: ProxyMessageKind.QueryResponse,
            response,
          });
        });
        break;
      case ProxyMessageKind.Call:
        this._agent.call(...msg.args).then(response => {
          this._frontend({
            id: msg.id,
            type: ProxyMessageKind.CallResponse,
            response,
          });
        });
        break;
      case ProxyMessageKind.ReadState:
        this._agent.readState(...msg.args).then(response => {
          this._frontend({
            id: msg.id,
            type: ProxyMessageKind.ReadStateResponse,
            response,
          });
        });
        break;
      case ProxyMessageKind.Status:
        this._agent.status().then(response => {
          this._frontend({
            id: msg.id,
            type: ProxyMessageKind.StatusResponse,
            response,
          });
        });
        break;

      default:
        throw new Error(`Invalid message received: ${JSON.stringify(msg)}`);
    }
  }
}

// An Agent that forwards calls to a backend. The calls are serialized
export class ProxyAgent implements Agent {
  private _nextId = 0;
  private _pendingCalls = new Map<number, [(resolve: any) => void, (reject: any) => void]>();

  constructor(private _backend: (msg: ProxyMessage) => void) {}

  public onmessage(msg: ProxyMessage): void {
    const id = msg.id;

    const maybePromise = this._pendingCalls.get(id);
    if (!maybePromise) {
      throw new Error('A proxy get the same message twice...');
    }

    this._pendingCalls.delete(id);
    const [resolve, reject] = maybePromise;

    switch (msg.type) {
      case ProxyMessageKind.Error:
        return reject(msg.error);
      case ProxyMessageKind.GetPrincipalResponse:
      case ProxyMessageKind.CallResponse:
      case ProxyMessageKind.QueryResponse:
      case ProxyMessageKind.ReadStateResponse:
      case ProxyMessageKind.StatusResponse:
        return resolve(msg.response);
      default:
        throw new Error(`Invalid message being sent to ProxyAgent: ${JSON.stringify(msg)}`);
    }
  }

  public getPrincipal(): Promise<Principal | null> {
    return this._sendAndWait({
      id: this._nextId++,
      type: ProxyMessageKind.GetPrincipal,
    }).then(principalOrNull => {
      if (typeof principalOrNull === 'string') {
        return Principal.fromText(principalOrNull);
      } else {
        return null;
      }
    });
  }

  public readState(fields: ReadStateFields): Promise<ReadStateResponse> {
    return this._sendAndWait({
      id: this._nextId++,
      type: ProxyMessageKind.ReadState,
      args: [fields],
    }) as Promise<ReadStateResponse>;
  }

  public call(canisterId: Principal | string, fields: CallFields): Promise<SubmitResponse> {
    return this._sendAndWait({
      id: this._nextId++,
      type: ProxyMessageKind.Call,
      args: [canisterId.toString(), fields],
    }) as Promise<SubmitResponse>;
  }

  public status(): Promise<JsonObject> {
    return this._sendAndWait({
      id: this._nextId++,
      type: ProxyMessageKind.Status,
    }) as Promise<JsonObject>;
  }

  public query(canisterId: Principal | string, fields: QueryFields): Promise<QueryResponse> {
    return this._sendAndWait({
      id: this._nextId++,
      type: ProxyMessageKind.Query,
      args: [canisterId.toString(), fields],
    }) as Promise<QueryResponse>;
  }

  public makeActorFactory(actorInterfaceFactory: IDL.InterfaceFactory): ActorFactory {
    return actor.makeActorFactory(actorInterfaceFactory);
  }

  private async _sendAndWait(msg: ProxyMessage): Promise<unknown> {
    return new Promise((resolve, reject) => {
      this._pendingCalls.set(msg.id, [resolve, reject]);

      this._backend(msg);
    });
  }
}
