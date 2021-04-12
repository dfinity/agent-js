import { Actor, ActorMethod, ActorSubclass, CallConfig } from '../actor';
import { Principal } from '../principal';
import managementCanisterIdl from './management_idl';

/* tslint:disable */
export interface ManagementCanisterRecord {
  provisional_create_canister_with_cycles: ActorMethod<[{ amount: [] | [number] }], { canister_id: Principal }>;
  install_code: ActorMethod<
    [
      {
        mode: { install: null } | { reinstall: null } | { upgrade: null };
        canister_id: Principal;
        wasm_module: number[];
        arg: number[];
        compute_allocation: [] | [number];
        memory_allocation: [] | [number];
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
