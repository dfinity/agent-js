'use strict';
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, '__esModule', { value: true });
exports.requestIdOf = exports.hashValue = exports.hash = void 0;
const candid_1 = require('@dfinity/candid');
const borc_1 = __importDefault(require('borc'));
const js_sha256_1 = require('js-sha256');
const buffer_js_1 = require('./utils/buffer.js');
/**
 * sha256 hash the provided Buffer
 * @param data - input to hash function
 */
function hash(data) {
  return js_sha256_1.sha256.create().update(new Uint8Array(data)).arrayBuffer();
}
exports.hash = hash;
/**
 *
 * @param value unknown value
 * @returns ArrayBuffer
 */
function hashValue(value) {
  if (value instanceof borc_1.default.Tagged) {
    return hashValue(value.value);
  } else if (typeof value === 'string') {
    return hashString(value);
  } else if (typeof value === 'number') {
    return hash((0, candid_1.lebEncode)(value));
  } else if (value instanceof ArrayBuffer || ArrayBuffer.isView(value)) {
    return hash(value);
  } else if (Array.isArray(value)) {
    const vals = value.map(hashValue);
    return hash((0, buffer_js_1.concat)(...vals));
  } else if (value && typeof value === 'object' && value._isPrincipal) {
    return hash(value.toUint8Array());
  } else if (typeof value === 'object' && value !== null && typeof value.toHash === 'function') {
    return hashValue(value.toHash());
    // TODO This should be move to a specific async method as the webauthn flow required
    // the flow to be synchronous to ensure Safari touch id works.
    // } else if (value instanceof Promise) {
    //   return value.then(x => hashValue(x));
  } else if (typeof value === 'bigint') {
    // Do this check much later than the other bigint check because this one is much less
    // type-safe.
    // So we want to try all the high-assurance type guards before this 'probable' one.
    return hash((0, candid_1.lebEncode)(value));
  }
  throw Object.assign(new Error(`Attempt to hash a value of unsupported type: ${value}`), {
    // include so logs/callers can understand the confusing value.
    // (when stringified in error message, prototype info is lost)
    value,
  });
}
exports.hashValue = hashValue;
const hashString = value => {
  const encoded = new TextEncoder().encode(value);
  return hash(encoded);
};
/**
 * Get the RequestId of the provided ic-ref request.
 * RequestId is the result of the representation-independent-hash function.
 * https://sdk.dfinity.org/docs/interface-spec/index.html#hash-of-map
 * @param request - ic-ref request to hash into RequestId
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function requestIdOf(request) {
  const hashed = Object.entries(request)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => {
      const hashedKey = hashString(key);
      const hashedValue = hashValue(value);
      return [hashedKey, hashedValue];
    });
  const traversed = hashed;
  const sorted = traversed.sort(([k1], [k2]) => {
    return (0, buffer_js_1.compare)(k1, k2);
  });
  const concatenated = (0, buffer_js_1.concat)(...sorted.map(x => (0, buffer_js_1.concat)(...x)));
  const requestId = hash(concatenated);
  return requestId;
}
exports.requestIdOf = requestIdOf;
//# sourceMappingURL=request_id.js.map
