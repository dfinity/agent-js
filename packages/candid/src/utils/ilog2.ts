/**
 * Equivalent to `Math.log2` with support for `BigInt` values
 *
 * @param n number or bigint
 */
export function ilog2(n: bigint | number) {
  return n > 0 ? BigInt(n).toString(2).length - 1 : NaN;
}
