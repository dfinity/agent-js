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
  return Actor.createActor<ManagementCanisterRecord>(managementCanisterIdl, {
    ...config,
    canisterId: Principal.fromHex(''),
  });
}
