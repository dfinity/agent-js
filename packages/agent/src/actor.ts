import { Buffer } from 'buffer/';
import {
  ActorMethod,
  CreateCertificateOptions,
  QueryResponseRejected,
  QueryResponseStatus,
  ReplicaRejectCode,
  SubmitResponse,
  CallConfig,
  ActorMetadata,
  ActorConfig,
  AbstractActor,
  AbstractAgent,
  IDL,
  CanisterInstallMode,
  ActorConstructor,
} from '@dfinity/types';
import { AgentError } from './errors';
import { pollForResponse, strategy } from './polling';
import { Principal } from '@dfinity/principal';
import { RequestId } from './request_id';
import { toHex } from './utils/buffer';
import { HttpAgent, getManagementCanister } from '.';

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
      'HTTP status code': response.status.toString(),
      'HTTP status text': response.statusText,
    });
  }
}

const metadataSymbol = Symbol.for('ic-agent-metadata');

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

type ActorWithMethods = AbstractActor | Actor | (Actor & Record<string, ActorMethod<unknown[]>>);

/**
 * An actor base class. An actor is an object containing only functions that will
 * return a promise. These functions are derived from the IDL definition.
 */
export class Actor implements AbstractActor {
  [key: symbol]: ActorMetadata | unknown;
  /**
   * Get the Agent class this Actor would call, or undefined if the Actor would use
   * the default agent (global.ic.agent).
   * @param actor The actor to get the agent of.
   */
  public static agentOf(actor: ActorWithMethods): AbstractAgent | undefined {
    if (!(metadataSymbol in actor)) {
      return undefined;
    }
    return ((actor as Actor)[metadataSymbol] as ActorMetadata).config.agent;
  }

  /**
   * Get the interface of an actor, in the form of an instance of a Service.
   * @param actor The actor to get the interface of.
   */
  public static interfaceOf(actor: ActorWithMethods): IDL.ServiceClass | undefined {
    if (!(metadataSymbol in actor)) {
      return undefined;
    }
    return ((actor as Actor)[metadataSymbol] as ActorMetadata).service;
  }

  public static canisterIdOf(actor: ActorWithMethods): Principal | undefined {
    if (!(metadataSymbol in actor)) {
      return undefined;
    }
    return Principal.from((actor as Actor)[metadataSymbol].config.canisterId);
  }

  public static async install(
    fields: {
      module: ArrayBuffer;
      mode?: CanisterInstallMode;
      arg?: ArrayBuffer;
    },
    config: ActorConfig,
  ): Promise<void> {
    const mode = fields.mode === undefined ? CanisterInstallMode.Install : fields.mode;
    // Need to transform the arg into a number array.
    const arg = fields.arg ? [...new Uint8Array(fields.arg)] : [];
    // Same for module.
    const wasmModule = [...new Uint8Array(fields.module)];
    const canisterId =
      typeof config.canisterId === 'string'
        ? Principal.fromText(config.canisterId)
        : config.canisterId;

    await getManagementCanister(config).install_code({
      mode: { [mode]: null } as any,
      arg,
      wasm_module: wasmModule,
      canister_id: Principal.from(canisterId),
    });
  }

  public static async createCanister(config?: CallConfig): Promise<Principal> {
    const { canister_id: canisterId } = await getManagementCanister(
      config || {},
    ).provisional_create_canister_with_cycles({ amount: [], settings: [] });

    return canisterId;
  }

  public static async createAndInstallCanister(
    interfaceFactory: IDL.InterfaceFactory,
    fields: {
      module: ArrayBuffer;
      arg?: ArrayBuffer;
    },
    config?: CallConfig,
  ): Promise<AbstractActor> {
    const canisterId = await this.createCanister(config);
    await this.install(
      {
        ...fields,
      },
      { ...config, canisterId },
    );

    return this.createActor(interfaceFactory, { ...config, canisterId });
  }

  public static createActorClass(interfaceFactory: IDL.InterfaceFactory): ActorConstructor {
    const service = interfaceFactory({ IDL });

    class CanisterActor extends Actor {
      [x: string]: ActorMethod;
      [key: symbol]: ActorMetadata | unknown;

      constructor(config: ActorConfig) {
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
          this[methodName] = _createActorMethod(this, methodName, func, config.blsVerify);
        }
      }
    }

    return CanisterActor;
  }

  public static createActor<T = Record<string, ActorMethod>>(
    interfaceFactory: IDL.InterfaceFactory,
    configuration: ActorConfig,
  ) {
    return new (this.createActorClass(interfaceFactory))(configuration) as unknown as Actor & T;
  }

  private [metadataSymbol]: ActorMetadata;

  protected constructor(metadata: ActorMetadata) {
    this[metadataSymbol] = Object.freeze(metadata);
  }
}

function _createActorMethod(
  actor: Actor,
  methodName: string,
  func: IDL.FuncClass,
  blsVerify?: CreateCertificateOptions['blsVerify'],
): ActorMethod {
  let caller: (options: CallConfig, ...args: unknown[]) => Promise<unknown>;
  if (func.annotations.includes('query')) {
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

      const result = await agent.query(cid, { methodName, arg });

      switch (result.status) {
        case QueryResponseStatus.Rejected:
          throw new QueryCallRejectedError(cid, methodName, result);

        case QueryResponseStatus.Replied:
          return decodeReturnValue(func.retTypes, result.reply.arg);
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

      const agent = options.agent || actor[metadataSymbol].config.agent || new HttpAgent();
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

      if (!response.ok) {
        throw new UpdateCallRejectedError(cid, methodName, requestId, response);
      }

      const pollStrategy = pollingStrategyFactory();
      const responseBytes = await pollForResponse(agent, ecid, requestId, pollStrategy, blsVerify);

      if (responseBytes !== undefined) {
        return decodeReturnValue(func.retTypes, responseBytes);
      } else if (func.retTypes.length === 0) {
        return undefined;
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
 * @param config
 */
export function getManagementCanister(config: CallConfig): ActorSubclass<ManagementCanisterRecord> {
  function transform(_methodName: string, args: unknown[], _callConfig: CallConfig) {
    const first = args[0] as any;
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
