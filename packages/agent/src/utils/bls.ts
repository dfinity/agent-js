// import init, { bls_init, bls_verify } from '../vendor/bls/bls';
import { bls12_381 } from '@noble/curves/bls12-381';
import { Hex } from '@noble/curves/abstract/utils';

export let verify: (pk: Hex, sig: Hex, msg: Hex) => boolean;

/**
 *
 * @param pk primary key: Hex
 * @param sig signature: Hex
 * @param msg message: Hex
 * @returns Promise resolving a boolean
 */
export async function blsVerify(pk: Hex, sig: Hex, msg: Hex): Promise<boolean> {
  // if (!verify) {
  //   await init();
  //   if (bls_init() !== 0) {
  //     throw new Error('Cannot initialize BLS');
  //   }
  //   verify = (pk1, sig1, msg1) => {
  //     // Reorder things from what the WASM expects (sig, m, w).
  //     return bls_verify(sig1, msg1, pk1) === 0;
  //   };
  // }
  console.log(pk.length);
  console.log(sig.length);
  console.log(msg.length);
  return bls12_381.verify(sig, msg, pk);
}
