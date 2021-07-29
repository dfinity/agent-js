import { fromHex, toHex } from './buffer';

test('fromHex', () => {
  expect(new Uint8Array(fromHex('000102030405060708090A0B0C0D0E0F10'))).toEqual(
    new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]),
  );
});

test('fromHex (2)', () => {
  expect(new Uint8Array(fromHex('FFFEFDFCFBFAF9F8F7F6F5F4F3F2F1F0'))).toEqual(
    new Uint8Array([
      255, 254, 253, 252, 251, 250, 249, 248, 247, 246, 245, 244, 243, 242, 241, 240,
    ]),
  );
});

test('toHex', () => {
  expect(toHex(new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]))).toEqual(
    '000102030405060708090a0b0c0d0e0f10',
  );
});
