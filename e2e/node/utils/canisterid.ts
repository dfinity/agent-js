import { Principal } from '@icp-sdk/core/principal';
import { execSync } from 'child_process';

export const getCanisterId = (canisterName: string): Principal => {
  return Principal.fromText(execSync(`dfx canister id ${canisterName}`).toString().trim());
};
