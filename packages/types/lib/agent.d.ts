import { AbstractIdentity } from './identity';
import { AbstractPrincipal } from './principal';
export declare type JsonValue = boolean | string | number | JsonArray | JsonObject;
export interface JsonArray extends Array<JsonValue> {}
export interface JsonObject extends Record<string, JsonValue> {}
/**
 * An Agent able to make calls and queries to a Replica. This is the base class for an agent. Details of HTTP Calls and responses are left as any, and are implemented in the HTTP Agent.
 */
export declare abstract class AbstractAgent {
  readonly rootKey: ArrayBuffer | null | undefined;
  /**
   * Returns the principal ID associated with this agent (by default). It only shows
   * the principal of the default identity in the agent, which is the principal used
   * when calls don't specify it.
   */
  abstract getPrincipal(): Promise<AbstractPrincipal>;
  /**
   * Send a read state query to the replica. This includes a list of paths to return,
   * and will return a Certificate. This will only reject on communication errors,
   * but the certificate might contain less information than requested.
   * @param effectiveCanisterId A Canister ID related to this call.
   * @param options The options for this call.
   * @param identity Identity for the call. If not specified, uses the instance identity.
   * @param request The request to send in case it has already been created.
   */
  abstract readState(
    effectiveCanisterId: AbstractPrincipal | string,
    options: any,
    identity?: AbstractIdentity,
    request?: any,
  ): Promise<any>;
  abstract call(canisterId: AbstractPrincipal | string, fields: any): Promise<any>;
  /**
   * Query the status endpoint of the replica. This normally has a few fields that
   * corresponds to the version of the replica, its root public key, and any other
   * information made public.
   * @returns A JsonObject that is essentially a record of fields from the status
   *     endpoint.
   */
  abstract status(): Promise<JsonObject>;
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
  abstract query(canisterId: AbstractPrincipal | string, options: any): Promise<any>;
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
  abstract fetchRootKey(): Promise<ArrayBuffer>;
  /**
   * If an application needs to invalidate an identity under certain conditions, an `Agent` may expose an `invalidateIdentity` method.
   * Invoking this method will set the inner identity used by the `Agent` to `null`.
   *
   * A use case for this would be - after a certain period of inactivity, a secure application chooses to invalidate the identity of any `HttpAgent` instances. An invalid identity can be replaced by `Agent.replaceIdentity`
   */
  invalidateIdentity?(): void;
  /**
   * If an application needs to replace an identity under certain conditions, an `Agent` may expose a `replaceIdentity` method.
   * Invoking this method will set the inner identity used by the `Agent` to a newly provided identity.
   *
   * A use case for this would be - after authenticating using `@dfinity/auth-client`, you can replace the `AnonymousIdentity` of your `Actor` with a `DelegationIdentity`.
   *
   * ```Actor.agentOf(defaultActor).replaceIdentity(await authClient.getIdentity());```
   */
  replaceIdentity?(identity: AbstractIdentity): void;
}
/**
 * Options when doing a {@link Agent.readState} call.
 */
export interface ReadStateOptions {
  /**
   * A list of paths to read the state of.
   */
  paths: ArrayBuffer[][];
}
