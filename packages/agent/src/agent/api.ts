import { ActorFactory } from '../actor';
import { Identity } from '../auth';
import {
  CallFields,
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
   * null if no principal is associated. It only shows the principal of the default
   * identity in the agent, which is the principal used when calls don't specify it.
   */
  getPrincipal(): Promise<Principal | null>;

  requestStatus(fields: RequestStatusFields): Promise<RequestStatusResponse>;

  call(canisterId: Principal | string, fields: CallFields): Promise<SubmitResponse>;

  status(): Promise<JsonObject>;

  createCanister(): Promise<SubmitResponse>;

  install(
    canisterId: Principal | string,
    fields: {
      module: BinaryBlob;
      arg?: BinaryBlob;
    },
  ): Promise<SubmitResponse>;

  query(canisterId: Principal | string, fields: QueryFields): Promise<QueryResponse>;

  makeActorFactory(actorInterfaceFactory: IDL.InterfaceFactory): ActorFactory;
}
