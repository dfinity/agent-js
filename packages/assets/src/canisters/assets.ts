import { Actor } from '@dfinity/agent';
import { ActorConfig } from '@dfinity/types';
import { idlFactory } from './assets_idl';
import _SERVICE from './assets_service';

export type AssetsCanisterRecord = _SERVICE;

/**
 * Create an assets canister actor
 * @param config Configuration to make calls to the Replica.
 */
export function getAssetsCanister(config: ActorConfig): Actor & AssetsCanisterRecord {
  return Actor.createActor<AssetsCanisterRecord>(idlFactory, config);
}
