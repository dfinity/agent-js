import { Actor, ActorConfig } from '../actor';
import assetCanister from './asset_idl';

export interface AssetCanisterRecord {
  store(path: string, content: number[]): Promise<void>;
  retrieve(path: string): Promise<number[]>;
}

/**
 * Create a management canister actor.
 * @param config The Actor configuration
 */
export function createAssetCanisterActor(config: ActorConfig) {
  return Actor.createActor<AssetCanisterRecord>(assetCanister, config);
}
