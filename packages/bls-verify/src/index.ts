/* eslint-disable @typescript-eslint/no-explicit-any */
import { CTX } from 'amcl-js';
import { toHex } from './utils';

export const blsVerify = async (
  primaryKey: Uint8Array | string,
  signature: Uint8Array | string,
  message: Uint8Array | string,
): Promise<boolean> => {
  const pk = typeof primaryKey === 'string' ? primaryKey : toHex(primaryKey);
  const sig = typeof signature === 'string' ? signature : toHex(signature);
  const msg = typeof message === 'string' ? message : toHex(message);
  const ctx = new CTX('BLS12381');
  if (((ctx as any).BLS as any).init() !== 0) {
    throw new Error('Cannot initialize BLS');
  }

  return (
    ((ctx as any).BLS as any).core_verify(
      ((ctx as any).BLS as any).stringtobytes(sig),
      ((ctx as any).BLS as any).stringtobytes(msg),
      ((ctx as any).BLS as any).stringtobytes(pk),
    ) == 0
  );
};
