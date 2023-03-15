import { Actor } from '../actor.js';
import { AbstractActor, CallConfig } from '@dfinity/types';
import { Principal } from '@dfinity/principal';
import managementCanisterIdl from './management_idl.js';
import _SERVICE from './management_service.js';

export type ManagementCanisterRecord = _SERVICE;

/**
 * Create a management canister actor
 * @param config
 */
export function getManagementCanister(config: CallConfig) {
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
  }) as Actor & ManagementCanisterRecord;
}
