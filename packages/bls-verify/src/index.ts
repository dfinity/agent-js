import { bls12_381 } from '@noble/curves/bls12-381';
import { toHex } from './utils';
export const blsVerify = async (
  primaryKey: Uint8Array | string,
  signature: Uint8Array | string,
  message: Uint8Array | string,
): Promise<boolean> => {
  const pk = typeof primaryKey === 'string' ? primaryKey : toHex(primaryKey);
  const sig = typeof signature === 'string' ? signature : toHex(signature);
  const msg = typeof message === 'string' ? message : toHex(message);
  return bls12_381.verifyShortSignature(sig, msg, pk);
};
