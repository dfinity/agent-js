import { Buffer } from 'buffer/';
import {
  Agent,
  getDefaultAgent,
  HttpDetailsResponse,
  QueryResponseRejected,
  QueryResponseStatus,
  ReplicaRejectCode,
  SubmitResponse,
} from './agent';
import { AgentError } from './errors';
import { IDL } from '@dfinity/candid';
import { pollForResponse, PollStrategyFactory, strategy } from './polling';
import { Principal } from '@dfinity/principal';
import { RequestId } from './request_id';
import { toHex } from './utils/buffer';
import { Certificate, CreateCertificateOptions } from './certificate';
import managementCanisterIdl from './canisters/management_idl';
import _SERVICE, { canister_settings } from './canisters/management_service';

export class ActorCallError extends AgentError {
  constructor(
    public readonly canisterId: Principal,
    public readonly methodName: string,
    public readonly type: 'query' | 'update',
    public readonly props: Record<string, string>,
  ) {
    super(
      [
        `Call failed:`,
        `  Canister: ${canisterId.toText()}`,
        `  Method: ${methodName} (${type})`,
        ...Object.getOwnPropertyNames(props).map(n => `  "${n}": ${JSON.stringify(props[n])}`),
      ].join('\n'),
    );
  }
}

export class QueryCallRejectedError extends ActorCallError {
  constructor(
    canisterId: Principal,
    methodName: string,
    public readonly result: QueryResponseRejected,
  ) {
    super(canisterId, methodName, 'query', {
      Status: result.status,
      Code: ReplicaRejectCode[result.reject_code] ?? `Unknown Code "${result.reject_code}"`,
      Message: result.reject_message,
    });
  }
}

export class UpdateCallRejectedError extends ActorCallError {
  constructor(
    canisterId: Principal,
    methodName: string,
    public readonly requestId: RequestId,
    public readonly response: SubmitResponse['response'],
  ) {
    super(canisterId, methodName, 'update', {
      'Request ID': toHex(requestId),
      ...(response.body
        ? {
            ...(response.body.error_code
              ? {
                  'Error code': response.body.error_code,
                }
              : {}),
            'Reject code': String(response.body.reject_code),
            'Reject message': response.body.reject_message,
          }
        : {
            'HTTP status code': response.status.toString(),
            'HTTP status text': response.statusText,
          }),
    });
  }
}

/**
 * Configuration to make calls to the Replica.
 */
export interface CallConfig {
  /**
   * An agent to use in this call, otherwise the actor or call will try to discover the
   * agent to use.
   */
  agent?: Agent;

  /**
   * A polling strategy factory that dictates how much and often we should poll the
   * read_state endpoint to get the result of an update call.
   */
  pollingStrategyFactory?: PollStrategyFactory;

  /**
   * The canister ID of this Actor.
   */
  canisterId?: string | Principal;

  /**
   * The effective canister ID. This should almost always be ignored.
   */
  effectiveCanisterId?: Principal;

  /**
   * A modifier that makes a call also return a certificate for proving to other
   * parties that a call was performed and has returned a particular result.
   *
   * If set to `true`, the method will return `{ result: <result as usual>, cert: ArrayBuffer }`.
   * If set to `false` or unset, the method will return `<result as usual>`.
   *
   * Only works with update calls. While used with query calls, makes them
   * return `{ result: <result as usual>, cert: <empty buf> }`.
   *
   * TODO: make query calls return replica signature this way
   */
  returnCertificate?: boolean;
}

/**
 * Configuration that can be passed to customize the Actor behaviour.
 */
export interface ActorConfig extends CallConfig {
  /**
   * The Canister ID of this Actor. This is required for an Actor.
   */
  canisterId: string | Principal;

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

  /**
   * Polyfill for BLS Certificate verification in case wasm is not supported
   */
  blsVerify?: CreateCertificateOptions['blsVerify'];
}

// TODO: move this to proper typing when Candid support TypeScript.
/**
 * A subclass of an actor. Actor class itself is meant to be a based class.
 */
export type ActorSubclass<T = Record<string, ActorMethod>> = Actor & T;

/**
 * Return type of an actor method with CallConfig passed.
 * If `CallConfig.returnCertificate` is `true`, returns `{ cert: ArrayBuffer, result: <usual result> }`
 * If `CallConfig.returnCertificate` is `false`, returns `<usual result>`.
 */
type ActorMethodWithOptionsResult<Conf extends CallConfig, Args extends unknown[], Ret> = (
  ...args: Args
) => Promise<Conf extends { returnCertificate: true } ? { cert: ArrayBuffer; result: Ret } : Ret>;

/**
 * An actor method type, defined for each methods of the actor service.
 */
export interface ActorMethod<Args extends unknown[] = unknown[], Ret = unknown> {
  (...args: Args): Promise<Ret>;
  withOptions<Conf extends CallConfig>(
    options: Conf,
  ): ActorMethodWithOptionsResult<Conf, Args, Ret>;
}

/**
 * An actor method type, defined for each methods of the actor service.
 */
export interface ActorMethodWithHttpDetails<Args extends unknown[] = unknown[], Ret = unknown>
  extends ActorMethod {
  (...args: Args): Promise<{
    httpDetails: HttpDetailsResponse;
    result: Ret;
    cert: Certificate | undefined;
  }>;
}

export type FunctionWithArgsAndReturn<Args extends unknown[] = unknown[], Ret = unknown> = (
  ...args: Args
) => Ret;

// Update all entries of T with the extra information from ActorMethodWithInfo
export type ActorMethodMappedWithHttpDetails<T> = {
  [K in keyof T]: T[K] extends FunctionWithArgsAndReturn<infer Args, infer Ret>
    ? ActorMethodWithHttpDetails<Args, Ret>
    : never;
};

/**
 * The mode used when installing a canister.
 */
export type CanisterInstallMode =
  | {
      reinstall: null;
    }
  | {
      upgrade:
        | []
        | [
            {
              skip_pre_upgrade: [] | [boolean];
            },
          ];
    }
  | {
      install: null;
    };

/**
 * Internal metadata for actors. It's an enhanced version of ActorConfig with
 * some fields marked as required (as they are defaulted) and canisterId as
 * a Principal type.
 */
interface ActorMetadata {
  service: IDL.ServiceClass;
  agent?: Agent;
  config: ActorConfig;
}

const metadataSymbol = Symbol.for('ic-agent-metadata');

export interface CreateActorClassOpts {
  httpDetails?: boolean;
}

interface CreateCanisterSettings {
  freezing_threshold?: bigint;
  controllers?: Array<Principal>;
  memory_allocation?: bigint;
  compute_allocation?: bigint;
}

/**
 * An actor base class. An actor is an object containing only functions that will
 * return a promise. These functions are derived from the IDL definition.
 */
export class Actor {
  /**
   * Get the Agent class this Actor would call, or undefined if the Actor would use
   * the default agent (global.ic.agent).
   * @param actor The actor to get the agent of.
   */
  public static agentOf(actor: Actor): Agent | undefined {
    return actor[metadataSymbol].config.agent;
  }

  /**
   * Get the interface of an actor, in the form of an instance of a Service.
   * @param actor The actor to get the interface of.
   */
  public static interfaceOf(actor: Actor): IDL.ServiceClass {
    return actor[metadataSymbol].service;
  }

  public static canisterIdOf(actor: Actor): Principal {
    return Principal.from(actor[metadataSymbol].config.canisterId);
  }

  public static async install(
    fields: {
      module: ArrayBuffer;
      mode?: CanisterInstallMode;
      arg?: ArrayBuffer;
    },
    config: ActorConfig,
  ): Promise<void> {
    const mode = fields.mode === undefined ? { install: null } : fields.mode;
    // Need to transform the arg into a number array.
    const arg = fields.arg ? [...new Uint8Array(fields.arg)] : [];
    // Same for module.
    const wasmModule = [...new Uint8Array(fields.module)];
    const canisterId =
      typeof config.canisterId === 'string'
        ? Principal.fromText(config.canisterId)
        : config.canisterId;

    await getManagementCanister(config).install_code({
      mode,
      arg,
      wasm_module: wasmModule,
      canister_id: canisterId,
      sender_canister_version: [],
    });
  }

  public static async createCanister(
    config?: CallConfig,
    settings?: CreateCanisterSettings,
  ): Promise<Principal> {
    function settingsToCanisterSettings(settings: CreateCanisterSettings): [canister_settings] {
      return [
        {
          controllers: settings.controllers ? [settings.controllers] : [],
          compute_allocation: settings.compute_allocation ? [settings.compute_allocation] : [],
          freezing_threshold: settings.freezing_threshold ? [settings.freezing_threshold] : [],
          memory_allocation: settings.memory_allocation ? [settings.memory_allocation] : [],
          reserved_cycles_limit: [],
          log_visibility: [],
        },
      ];
    }

    const { canister_id: canisterId } = await getManagementCanister(
      config || {},
    ).provisional_create_canister_with_cycles({
      amount: [],
      settings: settingsToCanisterSettings(settings || {}),
      specified_id: [],
      sender_canister_version: [],
    });

    return canisterId;
  }

  public static async createAndInstallCanister(
    interfaceFactory: IDL.InterfaceFactory,
    fields: {
      module: ArrayBuffer;
      arg?: ArrayBuffer;
    },
    config?: CallConfig,
  ): Promise<ActorSubclass> {
    const canisterId = await this.createCanister(config);
    await this.install(
      {
        ...fields,
      },
      { ...config, canisterId },
    );

    return this.createActor(interfaceFactory, { ...config, canisterId });
  }

  public static createActorClass(
    interfaceFactory: IDL.InterfaceFactory,
    options?: CreateActorClassOpts,
  ): ActorConstructor {
    const service = interfaceFactory({ IDL });

    class CanisterActor extends Actor {
      [x: string]: ActorMethod;

      constructor(config: ActorConfig) {
        if (!config.canisterId)
          throw new AgentError(
            `Canister ID is required, but received ${typeof config.canisterId} instead. If you are using automatically generated declarations, this may be because your application is not setting the canister ID in process.env correctly.`,
          );
        const canisterId =
          typeof config.canisterId === 'string'
            ? Principal.fromText(config.canisterId)
            : config.canisterId;

        super({
          config: {
            ...DEFAULT_ACTOR_CONFIG,
            ...config,
            canisterId,
          },
          service,
        });

        for (const [methodName, func] of service._fields) {
          if (options?.httpDetails) {
            func.annotations.push(ACTOR_METHOD_WITH_HTTP_DETAILS);
          }

          this[methodName] = _createActorMethod(this, methodName, func, config.blsVerify);
        }
      }
    }

    return CanisterActor;
  }

  public static createActor<T = Record<string, ActorMethod>>(
    interfaceFactory: IDL.InterfaceFactory,
    configuration: ActorConfig,
  ): ActorSubclass<T> {
    if (!configuration.canisterId) {
      throw new AgentError(
        `Canister ID is required, but received ${typeof configuration.canisterId} instead. If you are using automatically generated declarations, this may be because your application is not setting the canister ID in process.env correctly.`,
      );
    }
    return new (this.createActorClass(interfaceFactory))(
      configuration,
    ) as unknown as ActorSubclass<T>;
  }

  public static createActorWithHttpDetails<T = Record<string, ActorMethod>>(
    interfaceFactory: IDL.InterfaceFactory,
    configuration: ActorConfig,
  ): ActorSubclass<ActorMethodMappedWithHttpDetails<T>> {
    return new (this.createActorClass(interfaceFactory, { httpDetails: true }))(
      configuration,
    ) as unknown as ActorSubclass<ActorMethodMappedWithHttpDetails<T>>;
  }

  private [metadataSymbol]: ActorMetadata;

  protected constructor(metadata: ActorMetadata) {
    this[metadataSymbol] = Object.freeze(metadata);
  }
}

// IDL functions can have multiple return values, so decoding always
// produces an array. Ensure that functions with single or zero return
// values behave as expected.
function decodeReturnValue(types: IDL.Type[], msg: ArrayBuffer) {
  const returnValues = IDL.decode(types, Buffer.from(msg));
  switch (returnValues.length) {
    case 0:
      return undefined;
    case 1:
      return returnValues[0];
    default:
      return returnValues;
  }
}

const DEFAULT_ACTOR_CONFIG = {
  pollingStrategyFactory: strategy.defaultStrategy,
};

export type ActorConstructor = new (config: ActorConfig) => ActorSubclass;

export const ACTOR_METHOD_WITH_HTTP_DETAILS = 'http-details';

function _createActorMethod(
  actor: Actor,
  methodName: string,
  func: IDL.FuncClass,
  blsVerify?: CreateCertificateOptions['blsVerify'],
): ActorMethod {
  let caller: (options: CallConfig, ...args: unknown[]) => Promise<unknown>;
  if (func.annotations.includes('query') || func.annotations.includes('composite_query')) {
    caller = async (options, ...args) => {
      // First, if there's a config transformation, call it.
      options = {
        ...options,
        ...actor[metadataSymbol].config.queryTransform?.(methodName, args, {
          ...actor[metadataSymbol].config,
          ...options,
        }),
      };

      const agent = options.agent || actor[metadataSymbol].config.agent || getDefaultAgent();
      const cid = Principal.from(options.canisterId || actor[metadataSymbol].config.canisterId);
      const arg = IDL.encode(func.argTypes, args);

      const result = await agent.query(cid, {
        methodName,
        arg,
        effectiveCanisterId: options.effectiveCanisterId,
      });

      switch (result.status) {
        case QueryResponseStatus.Rejected:
          throw new QueryCallRejectedError(cid, methodName, result);

        case QueryResponseStatus.Replied:
          return func.annotations.includes(ACTOR_METHOD_WITH_HTTP_DETAILS)
            ? {
                httpDetails: result.httpDetails,
                result: decodeReturnValue(func.retTypes, result.reply.arg),
                cert: options.returnCertificate ? new ArrayBuffer(0) : undefined,
              }
            : options.returnCertificate
            ? {
                result: decodeReturnValue(func.retTypes, result.reply.arg),
                cert: new ArrayBuffer(0),
              }
            : decodeReturnValue(func.retTypes, result.reply.arg);
      }
    };
  } else {
    caller = async (options, ...args) => {
      // First, if there's a config transformation, call it.
      options = {
        ...options,
        ...actor[metadataSymbol].config.callTransform?.(methodName, args, {
          ...actor[metadataSymbol].config,
          ...options,
        }),
      };

      const agent = options.agent || actor[metadataSymbol].config.agent || getDefaultAgent();
      const { canisterId, effectiveCanisterId, pollingStrategyFactory } = {
        ...DEFAULT_ACTOR_CONFIG,
        ...actor[metadataSymbol].config,
        ...options,
      };
      const cid = Principal.from(canisterId);
      const ecid = effectiveCanisterId !== undefined ? Principal.from(effectiveCanisterId) : cid;
      const arg = IDL.encode(func.argTypes, args);
      const { requestId, response } = await agent.call(cid, {
        methodName,
        arg,
        effectiveCanisterId: ecid,
      });

      if (!response.ok || response.body /* IC-1462 */) {
        throw new UpdateCallRejectedError(cid, methodName, requestId, response);
      }

      const pollStrategy = pollingStrategyFactory();
      const [responseBytes, certificate] = await pollForResponse(
        agent,
        ecid,
        requestId,
        pollStrategy,
        undefined,
        blsVerify,
        true,
      );
      const shouldIncludeHttpDetails = func.annotations.includes(ACTOR_METHOD_WITH_HTTP_DETAILS);

      if (responseBytes !== undefined) {
        return shouldIncludeHttpDetails
          ? {
              httpDetails: response,
              result: decodeReturnValue(func.retTypes, responseBytes),
              cert: options.returnCertificate ? certificate : undefined,
            }
          : options.returnCertificate
          ? { result: decodeReturnValue(func.retTypes, responseBytes), cert: certificate }
          : decodeReturnValue(func.retTypes, responseBytes);
      } else if (func.retTypes.length === 0) {
        return shouldIncludeHttpDetails
          ? {
              httpDetails: response,
              result: undefined,
              cert: options.returnCertificate ? certificate : undefined,
            }
          : options.returnCertificate
          ? { result: undefined, cert: certificate }
          : undefined;
      } else {
        throw new Error(`Call was returned undefined, but type [${func.retTypes.join(',')}].`);
      }
    };
  }

  const handler = (...args: unknown[]) => caller({}, ...args);
  handler.withOptions =
    (options: CallConfig) =>
    (...args: unknown[]) =>
      caller(options, ...args);

  return handler as ActorMethod;
}

export type ManagementCanisterRecord = _SERVICE;

/**
 * Create a management canister actor
 * @param config - a CallConfig
 */
export function getManagementCanister(config: CallConfig): ActorSubclass<ManagementCanisterRecord> {
  function transform(
    _methodName: string,
    args: Record<string, unknown> & { canister_id: string }[],
  ) {
    if (config.effectiveCanisterId) {
      return { effectiveCanisterId: Principal.from(config.effectiveCanisterId) };
    }
    const first = args[0];
    let effectiveCanisterId = Principal.fromHex('');
    if (first && typeof first === 'object' && first.canister_id) {
      effectiveCanisterId = Principal.from(first.canister_id as unknown);
    }
    return { effectiveCanisterId };
  }

  return Actor.createActor<ManagementCanisterRecord>(managementCanisterIdl, {
    ...config,
    canisterId: Principal.fromHex(''),
    ...{
      callTransform: transform,
      queryTransform: transform,
    },
  });
}
