/**
 * Equivalent to `Math.log2` with support for `BigInt` values
 *
 * @param n number or bigint
 */
export function ilog2(n: bigint | number) {
  const nBig = BigInt(n);
  return nBig > 0 ? nBig.toString(2).length - 1 : NaN;
}
