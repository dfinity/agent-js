import { CTX } from 'amcl-js';

export class BLS {
  public static async blsVerify(pk: string, sig: string, msg: string): Promise<boolean> {
    if (!BLS.verify) {
      const ctx = new CTX("BLS12381");
      if (ctx.BLS.init() !== 0) {
        throw new Error('Cannot initialize BLS');
      }
      BLS.verify = (pk, sig, msg) => {
        return ctx.BLS.core_verify(ctx.BLS.stringtobytes(sig), ctx.BLS.stringtobytes(msg), ctx.BLS.stringtobytes(pk)) == 0;
      };
    }
    const res = BLS.verify(pk, sig, msg);
    return res;
  }
  private static verify: (pk: string, sig: string, msg: string) => boolean;

  private constructor() {}
}
