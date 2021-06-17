import { bufToHex, hexToUint8 } from './buffer';
describe('Buffer utility methods', () => {
  test('bufToHex', () => {
    const buffer = new Uint8Array([4, 8, 12, 16]).buffer;
    expect(bufToHex(buffer)).toBe('04080c10');
  });

  test('hexToUint8', () => {
    const hexString = '04080c10';
    const uint8 = hexToUint8(hexString);
    expect(uint8).toStrictEqual(new Uint8Array([4, 8, 12, 16]));
  });
});
