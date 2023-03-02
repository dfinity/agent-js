import { mapBurnTransaction, mapMintTransaction, mapTransferTransaction } from './mapping';

describe('Transaction Mapping', () => {
  describe('mapBurnTransaction', () => {
    it('should return an expected hashmap of a burn transaction', () => {
      const from = '7e565ccd5beb07ca6d32c2b4a44a4dce5ec51c30292402b07155f92a12ef0e61';
      const amount = BigInt('99990000');
      const nanoTimestamp = BigInt('1676584788365620473');
      const memo = BigInt('0');

      const result = mapBurnTransaction(from, amount, nanoTimestamp, memo);
      const expected = new Map<number, unknown>()
        .set(0, new Map().set(0, new Map().set(0, from).set(1, new Map().set(0, amount))))
        .set(1, memo)
        .set(2, new Map().set(0, nanoTimestamp));

      expect(result).toEqual(expected);
    });
  });

  describe('mapMintTransaction', () => {
    it('should return an expected hashmap of a mint transaction', () => {
      const to = 'e5ed0e644fc80ab9624efca0ef1bc9dd305566c7f72518025dfbf5e28da9bbc7';
      const amount = BigInt('116792432');
      const nanoTimestamp = BigInt('1676590136413841755');
      const memo = BigInt('1676590136');

      const result = mapMintTransaction(to, amount, nanoTimestamp, memo);
      const expected = new Map<number, unknown>()
        .set(0, new Map().set(1, new Map().set(0, to).set(1, new Map().set(0, amount))))
        .set(1, memo)
        .set(2, new Map().set(0, nanoTimestamp));

      expect(result).toEqual(expected);
    });
  });

  describe('mapTransferTransaction', () => {
    it('should return a hashmap of a transferTransaction transaction', () => {
      const from = 'fc3212c5017edbe21d97e261745d221b3b68c00ebd637050b090cdd91210afce';
      const to = '1fb0374c0fcf1610d422eb730026e745bf6085b868f6cef2831072e503f671c3';
      const amount = BigInt('30000000');
      const fee = BigInt('10000');
      const nanoTimestamp = BigInt('1675800449791828096');
      const memo = BigInt('0');

      const result = mapTransferTransaction(from, to, amount, fee, nanoTimestamp, memo);
      const expected = new Map()
        .set(
          0,
          new Map().set(
            2,
            new Map()
              .set(0, from)
              .set(1, to)
              .set(2, new Map().set(0, amount))
              .set(3, new Map().set(0, fee)),
          ),
        )
        .set(1, memo)
        .set(2, new Map().set(0, nanoTimestamp));

      expect(result).toEqual(expected);
    });
  });
});
