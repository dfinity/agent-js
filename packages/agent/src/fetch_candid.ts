import { Actor, ActorSubclass, Agent } from '.';
import { IDL } from '@dfinity/candid';

// Common interface for the hidden `__get_candid_interface_tmp_hack` actor method
const tmpHackInterface: IDL.InterfaceFactory = ({ IDL }) =>
  IDL.Service({
    __get_candid_interface_tmp_hack: IDL.Func([], [IDL.Text], ['query']),
  });

/**
 * Retrieves the Candid interface for the specified canister..
 *
 * @param agent The agent to use for the request (usually an `HttpAgent`)
 * @param canisterId A string corresponding to the canister ID
 * @returns Candid source code
 */
export async function fetchCandid(agent: Agent, canisterId: string): Promise<string> {
  const actor: ActorSubclass = Actor.createActor(tmpHackInterface, { agent, canisterId });
  const candidSource = (await actor.__get_candid_interface_tmp_hack()) as string;
  return candidSource;
}
