import { sha256 as jsSha256 } from 'js-sha256';

/**
 * Create a sha256 hash of a CBOR encoded transaction
 * @param data UInt8Array representation of a transaction.
 */
export function sha256(data: Uint8Array): string {
  return jsSha256.create().update(new Uint8Array(data)).hex();
}
