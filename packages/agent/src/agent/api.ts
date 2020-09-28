import { ActorFactory } from '../actor';
import {
  QueryFields,
  QueryResponse,
  RequestStatusFields,
  RequestStatusResponse,
  SubmitResponse,
} from '../http_agent_types';
import * as IDL from '../idl';
import { Principal } from '../principal';
import { BinaryBlob, JsonObject } from '../types';

// An Agent able to make calls and queries to a Replica.
export interface Agent {
  /**
   * Returns the principal ID associated with this agent (by default). This can be
   * null if no principal is associated. It also only shows the default, which is
   * the principal used when calls don't specify it.
   */
  getPrincipalId(): Promise<Principal | null>;

  requestStatus(fields: RequestStatusFields, principal?: Principal): Promise<RequestStatusResponse>;

  call(
    canisterId: Principal | string,
    fields: {
      methodName: string;
      arg: BinaryBlob;
    },
    principal?: Principal | Promise<Principal>,
  ): Promise<SubmitResponse>;

  createCanister(principal?: Principal): Promise<SubmitResponse>;

  status(): Promise<JsonObject>;

  install(
    canisterId: Principal | string,
    fields: {
      module: BinaryBlob;
      arg?: BinaryBlob;
    },
    principal?: Principal,
  ): Promise<SubmitResponse>;

  query(
    canisterId: Principal | string,
    fields: QueryFields,
    principal?: Principal,
  ): Promise<QueryResponse>;

  makeActorFactory(actorInterfaceFactory: IDL.InterfaceFactory): ActorFactory;
}
