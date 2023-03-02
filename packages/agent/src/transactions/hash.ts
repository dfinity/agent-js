import { createHash } from 'crypto';

/**
 * Create a sha256 hash of a CBOR encoded transaction
 * @param cborTransaction The encoded transaction to hash
 */
export function sha256(cborTransaction: Uint8Array): string {
  return createHash('sha256').update(cborTransaction).digest('hex');
}
