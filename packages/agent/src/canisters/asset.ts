import { Actor } from '../actor';
import { ActorConfig } from '@dfinity/types';
import assetCanister from './asset_idl';

/* tslint:disable */
export interface AssetCanisterRecord {
  store(path: string, content: number[]): Promise<void>;
  retrieve(path: string): Promise<number[]>;
}
/* tslint:enable */

/**
 * Create a management canister actor.
 * @param config
 */
export function createAssetCanisterActor(config: ActorConfig) {
  return Actor.createActor<AssetCanisterRecord>(assetCanister, config);
}
