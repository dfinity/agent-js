import { getCrc32 } from './getCrc';

describe('crc', () => {
  it('encodes properly', () => {
    // expect(getCrc32(new Uint8Array([]))).toBe(0);
    expect(getCrc32(new Uint8Array([1, 2, 3]))).toBe(123);
  });
});
