import { Buffer } from 'buffer/';
import { Agent, getDefaultAgent } from './agent';
import { getManagementCanister } from './canisters/management';
import { Certificate } from './certificate';
import { QueryResponseStatus, RequestStatusResponseStatus } from './http_agent_types';
import * as IDL from './idl';
import { Principal } from './principal';
import { RequestId, toHex as requestIdToHex } from './request_id';
import { BinaryBlob, blobFromText } from './types';

/**
 * Configuration to make calls to the Replica.
 */
export interface CallConfig {
  agent?: Agent;
  maxAttempts?: number;
  throttleDurationInMSecs?: number;
}

/**
 * Configuration that can be passed to customize the Actor behaviour.
 */
export interface ActorConfig extends CallConfig {
  canisterId: string | Principal;
}

// TODO: move this to proper typing when Candid support TypeScript.
/**
 * A subclass of an actor. Actor class itself is meant to be a based class.
 */
export type ActorSubclass<T = Record<string, ActorMethod>> = Actor & T;

/**
 * An actor method type, defined for each methods of the actor service.
 */
export interface ActorMethod<Args extends unknown[] = [], Ret extends unknown = unknown> {
  (...args: Args): Promise<Ret>;
  withOptions(options: CallConfig): (...args: Args) => Promise<Ret>;
}

/**
 * The mode used when installing a canister.
 */
export enum CanisterInstallMode {
  Install = 'install',
  Reinstall = 'reinstall',
  Upgrade = 'upgrade',
}

/**
 * Internal metadata for actors. It's an enhanced version of ActorConfig with
 * some fields marked as required (as they are defaulted) and canisterId as
 * a Principal type.
 */
interface ActorMetadata {
  canisterId: Principal;
  service: IDL.ServiceClass;
  agent?: Agent;
  maxAttempts: number;
  throttleDurationInMSecs: number;
}

const metadataSymbol = Symbol.for('ic-agent-metadata');

/**
 * An actor base class. An actor is an object containing only functions that will
 * return a promise. These functions are derived from the IDL definition.
 */
export class Actor {
  /**
   * Get the Agent class this Actor would call, or undefined if the Actor would use
   * the default agent (global.ic.agent).
   */
  public static agentOf(actor: Actor): Agent | undefined {
    return actor[metadataSymbol].agent;
  }

  /**
   * Get the interface of an actor, in the form of an instance of a Service.
   * @param actor The actor to get the interface of.
   */
  public static interfaceOf(actor: Actor): IDL.ServiceClass {
    return actor[metadataSymbol].service;
  }

  public static canisterIdOf(actor: Actor): Principal {
    return actor[metadataSymbol].canisterId;
  }

  public static async install(
    fields: {
      module: BinaryBlob;
      mode?: CanisterInstallMode;
      arg?: BinaryBlob;
      computerAllocation?: number;
      memoryAllocation?: number;
    },
    config: ActorConfig,
  ): Promise<void> {
    const mode = fields.mode === undefined ? CanisterInstallMode.Install : fields.mode;
    // Need to transform the arg into a number array.
    const arg = fields.arg ? [...fields.arg] : [];
    // Same for module.
    const wasmModule = [...fields.module];
    const canisterId =
      typeof config.canisterId === 'string'
        ? Principal.fromText(config.canisterId)
        : config.canisterId;
    const computerAllocation: [number] | [] =
      fields.computerAllocation !== undefined ? [fields.computerAllocation] : [];
    const memoryAllocation: [number] | [] =
      fields.memoryAllocation !== undefined ? [fields.memoryAllocation] : [];

    await getManagementCanister(config).install_code({
      mode: { [mode]: null } as any,
      arg,
      wasm_module: wasmModule,
      canister_id: canisterId,
      compute_allocation: computerAllocation,
      memory_allocation: memoryAllocation,
    });
  }

  public static async createCanister(config?: CallConfig): Promise<Principal> {
    const { canister_id: canisterId } = await getManagementCanister(config || {})
      .provisional_create_canister_with_cycles({ amount: [] });

    return canisterId;
  }

  public static async createAndInstallCanister(
    interfaceFactory: IDL.InterfaceFactory,
    fields: {
      module: BinaryBlob;
      arg?: BinaryBlob;
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

  public static createActorClass(interfaceFactory: IDL.InterfaceFactory): ActorConstructor {
    const service = interfaceFactory({ IDL });

    class CanisterActor extends Actor {
      [x: string]: ActorMethod;

      constructor(config: ActorConfig) {
        const canisterId =
          typeof config.canisterId === 'string'
            ? Principal.fromText(config.canisterId)
            : config.canisterId;

        super({
          ...DEFAULT_ACTOR_CONFIG,
          ...config,
          canisterId,
          service,
        });

        for (const [methodName, func] of service._fields) {
          this[methodName] = _createActorMethod(this, methodName, func);
        }
      }
    }

    return CanisterActor;
  }

  public static createActor<T = Record<string, ActorMethod>>(
    interfaceFactory: IDL.InterfaceFactory,
    configuration: ActorConfig,
  ): ActorSubclass<T> {
    return (new (this.createActorClass(interfaceFactory))(
      configuration,
    ) as unknown) as ActorSubclass<T>;
  }

  private [metadataSymbol]: ActorMetadata;

  protected constructor(metadata: ActorMetadata) {
    this[metadataSymbol] = metadata;
  }
}

// IDL functions can have multiple return values, so decoding always
// produces an array. Ensure that functions with single or zero return
// values behave as expected.
function decodeReturnValue(types: IDL.Type[], msg: BinaryBlob) {
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

const REQUEST_STATUS_RETRY_WAIT_DURATION_IN_MSECS = 500;
const DEFAULT_ACTOR_CONFIG = {
  maxAttempts: 30,
  throttleDurationInMSecs: REQUEST_STATUS_RETRY_WAIT_DURATION_IN_MSECS,
};

export type ActorConstructor = new (config: ActorConfig) => ActorSubclass;
export type ActorFactory = (config: ActorConfig) => ActorSubclass;

function _createActorMethod(actor: Actor, methodName: string, func: IDL.FuncClass): ActorMethod {
  let caller: (options: CallConfig, ...args: unknown[]) => Promise<unknown>;
  if (func.annotations.includes('query')) {
    caller = async (options: CallConfig, ...args: unknown[]) => {
      const agent = options.agent || actor[metadataSymbol].agent || getDefaultAgent();
      const cid = actor[metadataSymbol].canisterId;
      const arg = IDL.encode(func.argTypes, args) as BinaryBlob;

      const result = await agent.query(cid, { methodName, arg });

      switch (result.status) {
        case QueryResponseStatus.Rejected:
          throw new Error(
            `Query failed:\n` +
              `  Status: ${result.status}\n` +
              `  Message: ${result.reject_message}\n`,
          );

        case QueryResponseStatus.Replied:
          return decodeReturnValue(func.retTypes, result.reply.arg);
      }
    };
  } else {
    caller = async (options: CallConfig, ...args: unknown[]) => {
      const agent = options.agent || actor[metadataSymbol].agent || getDefaultAgent();
      const cid = actor[metadataSymbol].canisterId;

      const { maxAttempts, throttleDurationInMSecs } = { ...options, ...actor[metadataSymbol] };
      const arg = IDL.encode(func.argTypes, args) as BinaryBlob;
      const { requestId, response } = await agent.call(cid, { methodName, arg });

      if (!response.ok) {
        throw new Error(
          [
            'Call failed:',
            `  Method: ${methodName}(${args})`,
            `  Canister ID: ${cid.toHex()}`,
            `  Request ID: ${requestIdToHex(requestId)}`,
            `  HTTP status code: ${response.status}`,
            `  HTTP status text: ${response.statusText}`,
          ].join('\n'),
        );
      }

      return _requestStatusAndLoop(
        agent,
        requestId,
        bytes => {
          if (bytes !== undefined) {
            return decodeReturnValue(func.retTypes, bytes);
          } else if (func.retTypes.length === 0) {
            return undefined;
          } else {
            throw new Error(`Call was returned undefined, but type [${func.retTypes.join(',')}].`);
          }
        },
        maxAttempts,
        maxAttempts,
        throttleDurationInMSecs,
      );
    };
  }

  const handler = (...args: unknown[]) => caller({}, ...args);
  handler.withOptions = (options: CallConfig) => {
    return (...args: unknown[]) => caller(options, ...args);
  };
  return handler as ActorMethod;
}

async function _requestStatusAndLoop<T>(
  agent: Agent,
  requestId: RequestId,
  decoder: (response: BinaryBlob | undefined) => T,
  attempts: number,
  maxAttempts: number,
  throttle: number,
): Promise<T> {
  const path = [blobFromText('request_status'), requestId];
  const state = await agent.readState({ paths: [path] });
  const cert = new Certificate(state, agent);
  const verified = await cert.verify();
  if (!verified) {
    throw new Error('Fail to verify certificate');
  }
  const maybeBuf = cert.lookup([...path, blobFromText('status')]);
  let status;
  if (typeof maybeBuf === 'undefined') {
    // Missing requestId means we need to wait
    status = RequestStatusResponseStatus.Unknown;
  } else {
    status = maybeBuf.toString();
  }

  switch (status) {
    case RequestStatusResponseStatus.Replied: {
      const response = cert.lookup([...path, blobFromText('reply')]) as BinaryBlob;
      return decoder(response);
    }

    case RequestStatusResponseStatus.Received:
    case RequestStatusResponseStatus.Unknown:
    case RequestStatusResponseStatus.Processing:
      if (--attempts === 0) {
        throw new Error(
          `Failed to retrieve a reply for request after ${maxAttempts} attempts:\n` +
            `  Request ID: ${requestIdToHex(requestId)}\n` +
            `  Request status: ${status}\n`,
        );
      }

      // Wait a little, then retry.
      return new Promise(resolve => setTimeout(resolve, throttle)).then(() =>
        _requestStatusAndLoop(agent, requestId, decoder, attempts, maxAttempts, throttle),
      );

    case RequestStatusResponseStatus.Rejected:
      const rejectCode = cert.lookup([...path, blobFromText('reject_code')])!.toString();
      const rejectMessage = cert.lookup([...path, blobFromText('reject_message')])!.toString();
      throw new Error(
        `Call was rejected:\n` +
          `  Request ID: ${requestIdToHex(requestId)}\n` +
          `  Reject code: ${rejectCode}\n` +
          `  Reject text: ${rejectMessage}\n`,
      );

    case RequestStatusResponseStatus.Done:
      // This is _technically_ not an error, but we still didn't see the `Replied` status so
      // we don't know the result and cannot decode it.
      throw new Error(
        `Call was marked as done but we never saw the reply:\n` +
          `  Request ID: ${requestIdToHex(requestId)}\n`,
      );
  }
  throw new Error('unreachable');
}

// Make an actor from an actor interface.
//
// Allows for one HTTP agent for the lifetime of the actor:
//
// ```
// const actor = makeActor(actorInterface)({ agent });
// const reply = await actor.greet();
// ```
//
// or using a different HTTP agent for the same actor if necessary:
//
// ```
// const actor = makeActor(actorInterface);
// const reply1 = await actor(agent1).greet();
// const reply2 = await actor(agent2).greet();
// ```
export function makeActorFactory(actorInterfaceFactory: IDL.InterfaceFactory): ActorFactory {
  return (config: ActorConfig) => {
    return Actor.createActor(actorInterfaceFactory, config);
  };
}
