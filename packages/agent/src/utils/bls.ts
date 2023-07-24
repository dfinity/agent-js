import init, { bls_init, bls_verify } from '../vendor/bls/bls';

export let verify: (pk: Uint8Array, sig: Uint8Array, msg: Uint8Array) => boolean;

/**
 *
 * @param pk primary key: Uint8Array
 * @param sig signature: Uint8Array
 * @param msg message: Uint8Array
 * @returns Promise resolving a boolean
 */
export async function blsVerify(
  pk: Uint8Array,
  sig: Uint8Array,
  msg: Uint8Array,
): Promise<boolean> {
  if (!verify) {
    await init();
    if (bls_init() !== 0) {
      throw new Error('Cannot initialize BLS');
    }
    verify = (pk1, sig1, msg1) => {
      // Reorder things from what the WASM expects (sig, m, w).
      return bls_verify(sig1, msg1, pk1) === 0;
    };
  }
  return verify(pk, sig, msg);
}
