import { AbstractAgent } from './agent';
import * as IDL from './idl-placeholder';
import { AbstractPrincipal } from './principal';

export interface ActorMetadata {
  service: IDL.ServiceClass;
  agent?: AbstractAgent;
  config: ActorConfig;
}

export enum RequestStatusResponseStatus {
  Received = 'received',
  Processing = 'processing',
  Replied = 'replied',
  Rejected = 'rejected',
  Unknown = 'unknown',
  Done = 'done',
}

export type RequestId = ArrayBuffer & { __requestId__: void };

export type PollStrategy = (
  canisterId: AbstractPrincipal,
  requestId: RequestId,
  status: RequestStatusResponseStatus,
) => Promise<void>;
export type PollStrategyFactory = () => PollStrategy;

/**
 * Configuration to make calls to the Replica.
 */
export interface CallConfig {
  /**
   * An agent to use in this call, otherwise the actor or call will try to discover the
   * agent to use.
   */
  agent?: AbstractAgent;

  /**
   * A polling strategy factory that dictates how much and often we should poll the
   * read_state endpoint to get the result of an update call.
   */
  pollingStrategyFactory?: PollStrategyFactory;

  /**
   * The canister ID of this Actor.
   */
  canisterId?: string | AbstractPrincipal;

  /**
   * The effective canister ID. This should almost always be ignored.
   */
  effectiveCanisterId?: AbstractPrincipal;

  blsVerify?: VerifyFunc;
}

export type VerifyFunc = (pk: Uint8Array, sig: Uint8Array, msg: Uint8Array) => Promise<boolean>;

/**
 * Configuration that can be passed to customize the Actor behaviour.
 */
export interface ActorConfig extends CallConfig {
  /**
   * The Canister ID of this Actor. This is required for an Actor.
   */
  canisterId: string | AbstractPrincipal;

  /**
   * An override function for update calls' CallConfig. This will be called on every calls.
   */
  callTransform?(
    methodName: string,
    args: unknown[],
    callConfig: CallConfig,
  ): Partial<CallConfig> | void;

  /**
   * An override function for query calls' CallConfig. This will be called on every query.
   */
  queryTransform?(
    methodName: string,
    args: unknown[],
    callConfig: CallConfig,
  ): Partial<CallConfig> | void;
}

export type ActorConstructor = new (config: ActorConfig) => AbstractActor;

export interface ActorMetadata {
  config: ActorConfig;
  service: IDL.ServiceClass;
}

export abstract class AbstractActor {
  // allow for symbol key
  [key: symbol]: ActorMetadata | unknown;
}

export enum CanisterInstallMode {
  Install = 'install',
  Reinstall = 'reinstall',
  Upgrade = 'upgrade',
}

// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-constraint
export interface ActorMethod<Args extends unknown[] = unknown[], Ret extends unknown = unknown> {
  (...args: Args): Promise<Ret>;
  withOptions(options: CallConfig): (...args: Args) => Promise<Ret>;
}
