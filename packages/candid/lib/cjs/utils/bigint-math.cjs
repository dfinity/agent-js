'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.iexp2 = exports.ilog2 = void 0;
/**
 * Equivalent to `Math.log2(n)` with support for `BigInt` values
 *
 * @param n bigint or integer
 * @returns integer
 */
function ilog2(n) {
  const nBig = BigInt(n);
  if (n <= 0) {
    throw new RangeError('Input must be positive');
  }
  return nBig.toString(2).length - 1;
}
exports.ilog2 = ilog2;
/**
 * Equivalent to `2 ** n` with support for `BigInt` values
 * (necessary for browser preprocessors which replace the `**` operator with `Math.pow`)
 *
 * @param n bigint or integer
 * @returns bigint
 */
function iexp2(n) {
  const nBig = BigInt(n);
  if (n < 0) {
    throw new RangeError('Input must be non-negative');
  }
  return BigInt(1) << nBig;
}
exports.iexp2 = iexp2;
//# sourceMappingURL=bigint-math.js.map
