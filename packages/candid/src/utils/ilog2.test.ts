import { ilog2 } from './ilog2';

test('ilog2', () => {
  for (let n = -10; n < 100; n++) {
    expect(ilog2(n)).toBe(n > 0 ? Math.floor(Math.log2(n)) : NaN);
  }
  for (const p of [0, 1, 3, 55, 10000]) {
    expect(ilog2(BigInt(2) ** BigInt(p))).toBe(p);
  }

  expect(() => ilog2(1.5)).toThrow(
    'The number 1.5 cannot be converted to a BigInt because it is not an integer',
  );
  expect(() => (ilog2 as (string) => number)('abc')).toThrow('Cannot convert abc to a BigInt');
});
