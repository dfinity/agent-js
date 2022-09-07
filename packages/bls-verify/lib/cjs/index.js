'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.blsVerify = void 0;
const bls12_381_1 = require('@noble/bls12-381');
const utils_1 = require('./utils');
/**
 * BLS Verification to be used in an IC Agent, using the @noble/bls-12-381 pure JS implementation
 * @param {Uint8Array | string} publicKey - Uint8Array or string of the public key used to verify a BLS signature
 * @param {Uint8Array | string} signature - digital signature
 * @param {Uint8Array | string} message - message to verify
 * @returns boolean
 */
const blsVerify = async (publicKey, signature, message) => {
  const pk = typeof publicKey === 'string' ? publicKey : (0, utils_1.toHex)(publicKey);
  const sig = typeof signature === 'string' ? signature : (0, utils_1.toHex)(signature);
  const msg = typeof message === 'string' ? message : (0, utils_1.toHex)(message);
  return await (0, bls12_381_1.verify)(sig, msg, pk);
};
exports.blsVerify = blsVerify;
//# sourceMappingURL=index.js.map
