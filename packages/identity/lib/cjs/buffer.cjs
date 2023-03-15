'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.toHexString = exports.fromHexString = void 0;
/**
 * Return an array buffer from its hexadecimal representation.
 * @param hexString The hexadecimal string.
 */
function fromHexString(hexString) {
  var _a;
  return new Uint8Array(
    ((_a = hexString.match(/.{1,2}/g)) !== null && _a !== void 0 ? _a : []).map(byte =>
      parseInt(byte, 16),
    ),
  ).buffer;
}
exports.fromHexString = fromHexString;
/**
 * Returns an hexadecimal representation of an array buffer.
 * @param bytes The array buffer.
 */
function toHexString(bytes) {
  return new Uint8Array(bytes).reduce((str, byte) => str + byte.toString(16).padStart(2, '0'), '');
}
exports.toHexString = toHexString;
//# sourceMappingURL=buffer.js.map
