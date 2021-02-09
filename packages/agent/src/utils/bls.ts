import init, { bls_init, bls_verify } from '../vendor/bls/bls';
import { blobFromUint8Array, blobToHex } from "../types";

export let verify: (pk: Uint8Array, sig: Uint8Array, msg: Uint8Array) => boolean;

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
      return bls_verify(pk1, sig1, msg1) === 0;
    };
  }
  return verify(pk, sig, msg);
}
