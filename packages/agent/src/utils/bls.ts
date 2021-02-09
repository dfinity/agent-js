import init, { bls_init, bls_verify } from 'amcl-bls';

export class BLS {
  public static async blsVerify(pk: Uint8Array, sig: Uint8Array, msg: Uint8Array): Promise<boolean> {
    if (!BLS.verify) {
      await init(); //init('../vendor/bls/bls_bg.wasm');
      if (bls_init() !== 0) {
        throw new Error('Cannot initialize BLS');
      }
      BLS.verify = (pk, sig, msg) => {
        return bls_verify(pk, sig, msg) == 0;
      };
    }
    const res = BLS.verify(pk, sig, msg);
    return res;
  }
  private static verify: (pk: Uint8Array, sig: Uint8Array, msg: Uint8Array) => boolean;

  private constructor() {}
}
