import { ActorSubclass } from './actor';

export * from './actor';
export * from './agent';
export * from './auth';
export * from './certificate';
export * from './agent/http/transforms';
export * from './agent/http/types';
export * from './canisters/asset';
export * from './fetch_candid';
export * from './request_id';
export * from './utils/bls';
export * from './utils/buffer';
export * as polling from './polling';
/**
 * The CanisterStatus utility is used to request structured data directly from the IC public API. This data can be accessed using agent.readState, but CanisterStatus provides a helpful abstraction with some known paths.
 *
 * You can request a canisters Controllers, ModuleHash, Candid interface, Subnet, or Time, or provide a custom path {@link CanisterStatus.CustomPath} and pass arbitrary buffers for valid paths identified in https://internetcomputer.org/docs/current/references/ic-interface-spec.
 *
 * The primary method for this namespace is {@link CanisterStatus.request}
 */
export * as CanisterStatus from './canisterStatus';

import { Agent, HttpAgent } from './agent';
import { IDL } from '@dfinity/candid';

export * as Cbor from './cbor';

export interface GlobalInternetComputer {
  ic: {
    agent: Agent;
    HttpAgent: typeof HttpAgent;
    IDL: typeof IDL;
    /**
     * Simple advertisement of features in whoever is managing this `globalThis.ic`.
     * Use Case
     * * Scripts that know they need an ic feature can detect using this and, if not present
     *   (e.g. old bootstrap version), they can dynamically include their own and continue
     *   operating (e.g. polyfill).
     *   This is useful when adding features to bootstrap. You can still deploy your canister to
     *   an ic with old bootstrap, then just dynamically reload your own new-version bootstrap if
     *   needed.
     */
    features?: {
      /** This is falsy if authn isn't supported at all */
      authentication?: boolean;
    };
    /**
     * The Actor for the canister being used for the frontend. Normally should correspond to the
     * canister represented by the canister id in the URL.
     *
     * It does not have any functions configured.
     *
     * If a canister ID could not be found, no actor were created and this is undefined.
     */
    canister: ActorSubclass | undefined;
  };
}
