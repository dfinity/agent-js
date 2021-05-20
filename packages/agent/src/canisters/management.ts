import { Actor, ActorMethod, ActorSubclass, CallConfig } from '../actor';
import { Principal } from '@dfinity/principal';
import managementCanisterIdl from './management_idl';

export interface CanisterSettings {
  controller: [] | [Principal];
  compute_allocation: [] | [bigint];
  memory_allocation: [] | [bigint];
  freezing_threshold: [] | [bigint];
}

/* tslint:disable */
export interface ManagementCanisterRecord {
  provisional_create_canister_with_cycles: ActorMethod<
    [
      {
        amount: [] | [number];
        settings: [] | [CanisterSettings];
      },
    ],
    { canister_id: Principal }
  >;
  install_code: ActorMethod<
    [
      {
        mode: { install: null } | { reinstall: null } | { upgrade: null };
        canister_id: Principal;
        wasm_module: number[];
        arg: number[];
      },
    ],
    void
  >;
}
/* tslint:enable */

/**
 * Create a management canister actor.
 * @param config
 */
export function getManagementCanister(config: CallConfig): ActorSubclass<ManagementCanisterRecord> {
  function transform(methodName: string, args: unknown[], callConfig: CallConfig) {
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
