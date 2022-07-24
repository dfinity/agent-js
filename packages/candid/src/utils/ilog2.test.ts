import { ilog2 } from './ilog2';

test('log2', () => {
  for (let n = -10; n < 100; n++) {
    expect(ilog2(n)).toBe(n > 0 ? Math.floor(Math.log2(n)) : NaN);
  }
  for (const p of [0, 1, 3, 55, 10000]) {
    expect(ilog2(BigInt(2) ** BigInt(p))).toBe(p);
  }
});
