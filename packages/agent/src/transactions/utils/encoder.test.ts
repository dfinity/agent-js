import { encode } from './encoder';

describe('encoder', () => {
  describe('encode', () => {
    it('should encode a nested object into an expected Uint8Array', async () => {
      const value = { a: 1, b: 23598073549, c: { x: [1, 2, 3] } };
      const expected = new Buffer([
        163, 97, 97, 1, 97, 98, 27, 0, 0, 0, 5, 126, 142, 6, 205, 97, 99, 161, 97, 120, 131, 1, 2,
        3,
      ]);
      const result = encode(value);

      expect(result).toEqual(expected);
    });

    it('should encode an object with bigint values into an expected Uint8Array', async () => {
      const value = { a: 1, b: BigInt('235980735492309572345'), c: { x: [1, 2, 3] } };
      const expected = new Buffer([
        163, 97, 97, 1, 97, 98, 194, 73, 12, 202, 227, 252, 166, 150, 134, 218, 249, 97, 99, 161,
        97, 120, 131, 1, 2, 3,
      ]);
      const result = encode(value);

      expect(result).toEqual(expected);
    });
  });
});
