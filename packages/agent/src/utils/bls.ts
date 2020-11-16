// tslint:disable-next-line:no-var-requires
const BLSModule = require('./bls_gen');

export class BLS {
  public static async blsVerify(pk: string, sig: string, msg: string): Promise<boolean> {
    if (!BLS.verify) {
      const m = await BLSModule();
      if (m._init() !== 0) {
        throw new Error('Cannot initialize BLS');
      }
      BLS.verify = m.cwrap('verify', 'boolean', ['string', 'string', 'string']);
    }
    const res = BLS.verify(pk, sig, msg);
    return res;
  }
  private static verify: (pk: string, sig: string, msg: string) => boolean;

  private constructor() {}
}
