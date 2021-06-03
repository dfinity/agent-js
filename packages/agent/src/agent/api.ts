import { Principal } from '@dfinity/principal';
import { RequestId } from '../request_id';
import { BinaryBlob, JsonObject } from '@dfinity/candid';

/**
 * Codes used by the replica for rejecting a message.
 * See {@link https://sdk.dfinity.org/docs/interface-spec/#reject-codes | the interface spec}.
 */
export enum ReplicaRejectCode {
  SysFatal = 1,
  SysTransient = 2,
  DestinationInvalid = 3,
  CanisterReject = 4,
  CanisterError = 5,
}

/**
 * Options when doing a {@link Agent.readState} call.
 */
export interface ReadStateOptions {
  /**
   * A list of paths to read the state of.
   */
  paths: BinaryBlob[][];
}

/**
 *
 */
export type QueryResponse = QueryResponseReplied | QueryResponseRejected;

export const enum QueryResponseStatus {
  Replied = 'replied',
  Rejected = 'rejected',
}

export interface QueryResponseBase {
  status: QueryResponseStatus;
}

export interface QueryResponseReplied extends QueryResponseBase {
  status: QueryResponseStatus.Replied;
  reply: { arg: BinaryBlob };
}

export interface QueryResponseRejected extends QueryResponseBase {
  status: QueryResponseStatus.Rejected;
  reject_code: ReplicaRejectCode;
  reject_message: string;
}

/**
 * Options when doing a {@link Agent.query} call.
 */
export interface QueryFields {
  /**
   * The method name to call.
   */
  methodName: string;

  /**
   * A binary encoded argument. This is already encoded and will be sent as is.
   */
  arg: BinaryBlob;
}

/**
 * Options when doing a {@link Agent.call} call.
 */
export interface CallOptions {
  /**
   * The method name to call.
   */
  methodName: string;

  /**
   * A binary encoded argument. This is already encoded and will be sent as is.
   */
  arg: BinaryBlob;

  /**
   * An effective canister ID, used for routing. This should only be mentioned if
   * it's different from the canister ID.
   */
  effectiveCanisterId: Principal | string;
}

export interface ReadStateResponse {
  certificate: BinaryBlob;
}

export interface SubmitResponse {
  requestId: RequestId;
  response: {
    ok: boolean;
    status: number;
    statusText: string;
  };
}

/**
 * An Agent able to make calls and queries to a Replica.
 */
export interface Agent {
  readonly rootKey: BinaryBlob | null;
  /**
   * Returns the principal ID associated with this agent (by default). It only shows
   * the principal of the default identity in the agent, which is the principal used
   * when calls don't specify it.
   */
  getPrincipal(): Promise<Principal>;

  /**
   * Send a read state query to the replica. This includes a list of paths to return,
   * and will return a Certificate. This will only reject on communication errors,
   * but the certificate might contain less information than requested.
   * @param effectiveCanisterId A Canister ID related to this call.
   * @param options The options for this call.
   */
  readState(
    effectiveCanisterId: Principal | string,
    options: ReadStateOptions,
  ): Promise<ReadStateResponse>;

  call(canisterId: Principal | string, fields: CallOptions): Promise<SubmitResponse>;

  /**
   * Query the status endpoint of the replica. This normally has a few fields that
   * corresponds to the version of the replica, its root public key, and any other
   * information made public.
   * @returns A JsonObject that is essentially a record of fields from the status
   *     endpoint.
   */
  status(): Promise<JsonObject>;

  /**
   * Send a query call to a canister. See
   * {@link https://sdk.dfinity.org/docs/interface-spec/#http-query | the interface spec}.
   * @param canisterId The Principal of the Canister to send the query to. Sending a query to
   *     the management canister is not supported (as it has no meaning from an agent).
   * @param options Options to use to create and send the query.
   * @returns The response from the replica. The Promise will only reject when the communication
   *     failed. If the query itself failed but no protocol errors happened, the response will
   *     be of type QueryResponseRejected.
   */
  query(canisterId: Principal | string, options: QueryFields): Promise<QueryResponse>;

  /**
   * By default, the agent is configured to talk to the main Internet Computer,
   * and verifies responses using a hard-coded public key.
   *
   * This function will instruct the agent to ask the endpoint for its public
   * key, and use that instead. This is required when talking to a local test
   * instance, for example.
   *
   * Only use this when you are  _not_ talking to the main Internet Computer,
   * otherwise you are prone to man-in-the-middle attacks! Do not call this
   * function by default.
   */
  fetchRootKey(): Promise<BinaryBlob>;
}
