import { ActorSubclass } from './actor';

export * from './actor';
export * from './agent';
export * from './certificate';
export * from './auth';
export * from './http_agent_transforms';
export * from './http_agent_types';
export * from './principal';
export * from './types';
export * from './canisters/asset';
export * from './canisters/management';
export * from './request_id';
export * from './candid';

import { Agent, HttpAgent } from './agent';
import * as IDL from './idl';
export { IDL };

import * as UICore from './candid/candid-core';
import * as UI from './candid/candid-ui';
export { UICore, UI };

export interface GlobalInternetComputer {
  ic: {
    agent: Agent;
    HttpAgent: typeof HttpAgent;
    IDL: typeof IDL;
    /**
     * Simple advertisement of features in whoever is managing this `globalThis.ic`.
     * Use Case
     * * Scripts that know they need an ic feature can detect using this and, if not present (e.g. old bootstrap version), they can dynamically include their own and continue operating (e.g. polyfill).
     *   This is useful when adding features to bootstrap. You can still deploy your canister to an ic with old bootstrap, then just dynamically reload your own new-version bootstrap if needed.
     */
    features?: {
      /** This is falsy if authn isn't supported at all */
      authentication?: Boolean;
    };
    /**
     * The Actor for the canister being used for the frontend. Normally should correspond to the
     * canister represented by the canister id in the URL.
     *
     * It does not have any functions configured.
     *
     * If a canister ID could not be found, no actor were created and this is undefined.
     */
    canister: ActorSubclass<{}> | undefined;
  };
}
