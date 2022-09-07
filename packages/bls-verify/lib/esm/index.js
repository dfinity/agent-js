import { verify } from '@noble/bls12-381';
import { toHex } from './utils';
/**
 * BLS Verification to be used in an IC Agent, using the @noble/bls-12-381 pure JS implementation
 * @param {Uint8Array | string} publicKey - Uint8Array or string of the public key used to verify a BLS signature
 * @param {Uint8Array | string} signature - digital signature
 * @param {Uint8Array | string} message - message to verify
 * @returns boolean
 */
export const blsVerify = async (publicKey, signature, message) => {
  const pk = typeof publicKey === 'string' ? publicKey : toHex(publicKey);
  const sig = typeof signature === 'string' ? signature : toHex(signature);
  const msg = typeof message === 'string' ? message : toHex(message);
  return await verify(sig, msg, pk);
};
//# sourceMappingURL=index.js.map
