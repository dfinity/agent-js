import { ilog2, iexp2 } from './bigint-math';

test('ilog2', () => {
  for (let n = 1; n < 100; n++) {
    expect(ilog2(n)).toBe(n > 0 ? Math.floor(Math.log2(n)) : NaN);
  }
  expect(() => ilog2(0)).toThrow('Input must be positive');
  expect(() => ilog2(-1)).toThrow('Input must be positive');
  expect(() => ilog2(1.5)).toThrow(
    'The number 1.5 cannot be converted to a BigInt because it is not an integer',
  );
  expect(() => (ilog2 as (any) => number)('abc')).toThrow('Cannot convert abc to a BigInt');
});

test('iexp2', () => {
  for (let n = 0; n < 10; n++) {
    expect(iexp2(n)).toBe(BigInt(2 ** n));
  }
  expect(() => ilog2(-1)).toThrow('Input must be positive');
  expect(() => iexp2(1.5)).toThrow(
    'The number 1.5 cannot be converted to a BigInt because it is not an integer',
  );
  expect(() => (ilog2 as (any) => number)('abc')).toThrow('Cannot convert abc to a BigInt');
});

test('ilog2 and iexp2', () => {
  for (const p of [0, 1, 3, 55, 10000]) {
    expect(ilog2(iexp2(BigInt(p)))).toBe(p);
  }
});
