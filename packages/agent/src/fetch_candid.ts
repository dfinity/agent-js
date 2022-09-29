import { Actor, ActorSubclass, CanisterStatus, HttpAgent } from '.';
import { Principal } from '@dfinity/principal';
import { IDL } from '@dfinity/candid';

/**
 * Retrieves the Candid interface for the specified canister.
 *
 * @param agent The agent to use for the request (usually an `HttpAgent`)
 * @param canisterId A string corresponding to the canister ID
 * @returns Candid source code
 */
export async function fetchCandid(canisterId: string, agent?: HttpAgent): Promise<string> {
  if (!agent) {
    // Create an anonymous `HttpAgent` (adapted from Candid UI)
    agent = new HttpAgent();
    const hostname = agent['_host'].hostname;
    if (hostname === '127.0.0.1' || hostname.endsWith('localhost')) {
      agent.fetchRootKey();
    }
  }

  // Attempt to use canister metadata
  const status = await CanisterStatus.request({
    agent,
    canisterId: Principal.fromText(canisterId),
    paths: ['candid'],
  });
  const candid = status.get('candid') as string | undefined;
  if (candid) {
    return candid;
  }

  // Use `__get_candid_interface_tmp_hack` for canisters without Candid metadata
  const tmpHackInterface: IDL.InterfaceFactory = ({ IDL }) =>
    IDL.Service({
      __get_candid_interface_tmp_hack: IDL.Func([], [IDL.Text], ['query']),
    });
  const actor: ActorSubclass = Actor.createActor(tmpHackInterface, { agent, canisterId });
  return (await actor.__get_candid_interface_tmp_hack()) as string;
}
