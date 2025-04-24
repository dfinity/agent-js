import {
  Agent,
  HttpDetailsResponse,
  isV2ResponseBody,
  isV3ResponseBody,
  QueryResponseRejected,
  QueryResponseStatus,
  ReplicaRejectCode,
  SubmitResponse,
} from './agent';
import { AgentError } from './errors';
import { uint8FromBufLike, IDL, strToUtf8 } from '@dfinity/candid';
import { DEFAULT_POLLING_OPTIONS, pollForResponse, PollingOptions } from './polling';
import { Principal } from '@dfinity/principal';
import { RequestId } from './request_id';
import { toHex } from '@dfinity/candid';
import { Certificate, CreateCertificateOptions, lookupResultToBuffer } from './certificate';
import managementCanisterIdl from './canisters/management_idl';
import _SERVICE, { canister_install_mode, canister_settings } from './canisters/management_service';
import { HttpAgent } from './agent/http';

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
    public readonly reject_code: ReplicaRejectCode,
    public readonly reject_message: string,
    public readonly error_code?: string,
  ) {
    super(canisterId, methodName, 'update', {
      'Request ID': toHex(requestId),
      ...(response.body
        ? {
            ...(error_code
              ? {
                  'Error code': error_code,
                }
              : {}),
            'Reject code': String(reject_code),
            'Reject message': reject_message,
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
   * Options for controlling polling behavior.
   */
  pollingOptions?: PollingOptions;

  /**
   * The canister ID of this Actor.
   */
  canisterId?: string | Principal;

  /**
   * The effective canister ID. This should almost always be ignored.
   */
  effectiveCanisterId?: Principal;
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

  /**
   * Polling options to use when making update calls. This will override the default DEFAULT_POLLING_OPTIONS.
   */
  pollingOptions?: PollingOptions;
}

// TODO: move this to proper typing when Candid support TypeScript.
/**
 * A subclass of an actor. Actor class itself is meant to be a based class.
 */
export type ActorSubclass<T = Record<string, ActorMethod>> = Actor & T;

/**
 * An actor method type, defined for each methods of the actor service.
 */
export interface ActorMethod<Args extends unknown[] = unknown[], Ret = unknown> {
  (...args: Args): Promise<Ret>;

  withOptions(options: CallConfig): (...args: Args) => Promise<Ret>;
}

/**
 * An actor method type, defined for each methods of the actor service.
 */
export interface ActorMethodWithHttpDetails<Args extends unknown[] = unknown[], Ret = unknown>
  extends ActorMethod {
  (...args: Args): Promise<{ httpDetails: HttpDetailsResponse; result: Ret }>;
}

/**
 * An actor method type, defined for each methods of the actor service.
 */
export interface ActorMethodExtended<Args extends unknown[] = unknown[], Ret = unknown>
  extends ActorMethod {
  (...args: Args): Promise<{
    certificate?: Certificate;
    httpDetails?: HttpDetailsResponse;
    result: Ret;
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

// Update all entries of T with the extra information from ActorMethodWithInfo
export type ActorMethodMappedExtended<T> = {
  [K in keyof T]: T[K] extends FunctionWithArgsAndReturn<infer Args, infer Ret>
    ? ActorMethodExtended<Args, Ret>
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
  certificate?: boolean;
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
      module: Uint8Array;
      mode?: canister_install_mode;
      arg?: Uint8Array;
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
          wasm_memory_limit: [],
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
      module: Uint8Array;
      arg?: Uint8Array;
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
          if (options?.certificate) {
            func.annotations.push(ACTOR_METHOD_WITH_CERTIFICATE);
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

  /**
   * Returns an actor with methods that return the http response details along with the result
   * @param interfaceFactory - the interface factory for the actor
   * @param configuration - the configuration for the actor
   * @deprecated - use createActor with actorClassOptions instead
   */
  public static createActorWithHttpDetails<T = Record<string, ActorMethod>>(
    interfaceFactory: IDL.InterfaceFactory,
    configuration: ActorConfig,
  ): ActorSubclass<ActorMethodMappedWithHttpDetails<T>> {
    return new (this.createActorClass(interfaceFactory, { httpDetails: true }))(
      configuration,
    ) as unknown as ActorSubclass<ActorMethodMappedWithHttpDetails<T>>;
  }

  /**
   * Returns an actor with methods that return the http response details along with the result
   * @param interfaceFactory - the interface factory for the actor
   * @param configuration - the configuration for the actor
   * @param actorClassOptions - options for the actor class extended details to return with the result
   */
  public static createActorWithExtendedDetails<T = Record<string, ActorMethod>>(
    interfaceFactory: IDL.InterfaceFactory,
    configuration: ActorConfig,
    actorClassOptions: CreateActorClassOpts = {
      httpDetails: true,
      certificate: true,
    },
  ): ActorSubclass<ActorMethodMappedExtended<T>> {
    return new (this.createActorClass(interfaceFactory, actorClassOptions))(
      configuration,
    ) as unknown as ActorSubclass<ActorMethodMappedExtended<T>>;
  }

  private [metadataSymbol]: ActorMetadata;

  protected constructor(metadata: ActorMetadata) {
    this[metadataSymbol] = Object.freeze(metadata);
  }
}

// IDL functions can have multiple return values, so decoding always
// produces an array. Ensure that functions with single or zero return
// values behave as expected.
function decodeReturnValue(types: IDL.Type[], msg: Uint8Array) {
  const returnValues = IDL.decode(types, msg);
  switch (returnValues.length) {
    case 0:
      return undefined;
    case 1:
      return returnValues[0];
    default:
      return returnValues;
  }
}

const DEFAULT_ACTOR_CONFIG: Partial<ActorConfig> = {
  pollingOptions: DEFAULT_POLLING_OPTIONS,
};

export type ActorConstructor = new (config: ActorConfig) => ActorSubclass;

export const ACTOR_METHOD_WITH_HTTP_DETAILS = 'http-details';
export const ACTOR_METHOD_WITH_CERTIFICATE = 'certificate';

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

      const agent = options.agent || actor[metadataSymbol].config.agent || new HttpAgent();
      const cid = Principal.from(options.canisterId || actor[metadataSymbol].config.canisterId);
      const arg = IDL.encode(func.argTypes, args);

      const result = await agent.query(cid, {
        methodName,
        arg,
        effectiveCanisterId: options.effectiveCanisterId,
      });
      const httpDetails = {
        ...result.httpDetails,
        requestDetails: result.requestDetails,
      } as HttpDetailsResponse;

      switch (result.status) {
        case QueryResponseStatus.Rejected:
          throw new QueryCallRejectedError(cid, methodName, result);

        case QueryResponseStatus.Replied:
          return func.annotations.includes(ACTOR_METHOD_WITH_HTTP_DETAILS)
            ? {
                httpDetails,
                result: decodeReturnValue(func.retTypes, result.reply.arg),
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

      const agent = options.agent || actor[metadataSymbol].config.agent || HttpAgent.createSync();

      const { canisterId, effectiveCanisterId, pollingOptions } = {
        ...DEFAULT_ACTOR_CONFIG,
        ...actor[metadataSymbol].config,
        ...options,
      };
      const cid = Principal.from(canisterId);
      const ecid = effectiveCanisterId !== undefined ? Principal.from(effectiveCanisterId) : cid;
      const arg = IDL.encode(func.argTypes, args);

      const { requestId, response, requestDetails } = await agent.call(cid, {
        methodName,
        arg,
        effectiveCanisterId: ecid,
      });
      let reply: Uint8Array | undefined;
      let certificate: Certificate | undefined;
      if (isV3ResponseBody(response.body)) {
        // handle v3 response errors by throwing an UpdateCallRejectedError object
        if (agent.rootKey == null) {
          throw new AgentError('Agent root key not initialized before calling');
        }
        const cert = response.body.certificate;
        certificate = await Certificate.create({
          certificate: uint8FromBufLike(cert),
          rootKey: agent.rootKey,
          canisterId: Principal.from(canisterId),
          blsVerify,
        });
        const path = [strToUtf8('request_status'), requestId];
        const status = new TextDecoder().decode(
          lookupResultToBuffer(certificate.lookup([...path, 'status'])),
        );

        switch (status) {
          case 'replied':
            reply = lookupResultToBuffer(certificate.lookup([...path, 'reply']));
            break;
          case 'rejected': {
            // Find rejection details in the certificate
            const rejectCode = new Uint8Array(
              lookupResultToBuffer(certificate.lookup([...path, 'reject_code']))!,
            )[0];
            const rejectMessage = new TextDecoder().decode(
              lookupResultToBuffer(certificate.lookup([...path, 'reject_message']))!,
            );

            const error_code_buf = lookupResultToBuffer(
              certificate.lookup([...path, 'error_code']),
            );
            const error_code = error_code_buf
              ? new TextDecoder().decode(error_code_buf)
              : undefined;

            throw new UpdateCallRejectedError(
              cid,
              methodName,
              requestId,
              response,
              rejectCode,
              rejectMessage,
              error_code,
            );
          }
        }
      } else if (isV2ResponseBody(response.body)) {
        // handle v2 response errors by throwing an UpdateCallRejectedError object
        const { reject_code, reject_message, error_code } = response.body;
        throw new UpdateCallRejectedError(
          cid,
          methodName,
          requestId,
          response,
          reject_code,
          reject_message,
          error_code,
        );
      }

      // Fall back to polling if we receive an Accepted response code
      if (response.status === 202) {
        const pollOptions: PollingOptions = {
          ...pollingOptions,
          blsVerify,
        };
        // Contains the certificate and the reply from the boundary node
        const response = await pollForResponse(agent, ecid, requestId, pollOptions);
        certificate = response.certificate;
        reply = response.reply;
      }
      const shouldIncludeHttpDetails = func.annotations.includes(ACTOR_METHOD_WITH_HTTP_DETAILS);
      const shouldIncludeCertificate = func.annotations.includes(ACTOR_METHOD_WITH_CERTIFICATE);

      const httpDetails = { ...response, requestDetails } as HttpDetailsResponse;
      if (reply !== undefined) {
        if (shouldIncludeHttpDetails && shouldIncludeCertificate) {
          return {
            httpDetails,
            certificate,
            result: decodeReturnValue(func.retTypes, reply),
          };
        } else if (shouldIncludeCertificate) {
          return {
            certificate,
            result: decodeReturnValue(func.retTypes, reply),
          };
        } else if (shouldIncludeHttpDetails) {
          return {
            httpDetails,
            result: decodeReturnValue(func.retTypes, reply),
          };
        }
        return decodeReturnValue(func.retTypes, reply);
      } else if (func.retTypes.length === 0) {
        return shouldIncludeHttpDetails
          ? {
              httpDetails: response,
              result: undefined,
            }
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
    methodName: string,
    args: Record<string, unknown> & { canister_id: string; target_canister?: unknown }[],
  ) {
    if (config.effectiveCanisterId) {
      return { effectiveCanisterId: Principal.from(config.effectiveCanisterId) };
    }
    const first = args[0];
    let effectiveCanisterId = Principal.fromHex('');
    if (
      first &&
      typeof first === 'object' &&
      first.target_canister &&
      methodName === 'install_chunked_code'
    ) {
      effectiveCanisterId = Principal.from(first.target_canister);
    }
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

export class AdvancedActor extends Actor {
  constructor(metadata: ActorMetadata) {
    super(metadata);
  }
}
