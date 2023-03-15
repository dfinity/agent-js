'use strict';
var __createBinding =
  (this && this.__createBinding) ||
  (Object.create
    ? function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        var desc = Object.getOwnPropertyDescriptor(m, k);
        if (!desc || ('get' in desc ? !m.__esModule : desc.writable || desc.configurable)) {
          desc = {
            enumerable: true,
            get: function () {
              return m[k];
            },
          };
        }
        Object.defineProperty(o, k2, desc);
      }
    : function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        o[k2] = m[k];
      });
var __setModuleDefault =
  (this && this.__setModuleDefault) ||
  (Object.create
    ? function (o, v) {
        Object.defineProperty(o, 'default', { enumerable: true, value: v });
      }
    : function (o, v) {
        o['default'] = v;
      });
var __importStar =
  (this && this.__importStar) ||
  function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null)
      for (var k in mod)
        if (k !== 'default' && Object.prototype.hasOwnProperty.call(mod, k))
          __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
  };
Object.defineProperty(exports, '__esModule', { value: true });
exports.makeExpiryTransform =
  exports.makeNonceTransform =
  exports.Expiry =
  exports.makeNonce =
    void 0;
const candid_1 = require('@dfinity/candid');
const cbor = __importStar(require('simple-cbor'));
/**
 * Create a random Nonce, based on date and a random suffix.
 */
function makeNonce() {
  // Encode 128 bits.
  const buffer = new ArrayBuffer(16);
  const view = new DataView(buffer);
  const now = BigInt(+Date.now());
  const randHi = Math.floor(Math.random() * 0xffffffff);
  const randLo = Math.floor(Math.random() * 0xffffffff);
  // Fix for IOS < 14.8 setBigUint64 absence
  if (typeof view.setBigUint64 === 'function') {
    view.setBigUint64(0, now);
  } else {
    const TWO_TO_THE_32 = BigInt(1) << BigInt(32);
    view.setUint32(0, Number(now >> BigInt(32)));
    view.setUint32(4, Number(now % TWO_TO_THE_32));
  }
  view.setUint32(8, randHi);
  view.setUint32(12, randLo);
  return buffer;
}
exports.makeNonce = makeNonce;
const NANOSECONDS_PER_MILLISECONDS = BigInt(1000000);
const REPLICA_PERMITTED_DRIFT_MILLISECONDS = BigInt(60 * 1000);
class Expiry {
  constructor(deltaInMSec) {
    // Use bigint because it can overflow the maximum number allowed in a double float.;
    this._value =
      (BigInt(Date.now()) + BigInt(deltaInMSec) - REPLICA_PERMITTED_DRIFT_MILLISECONDS) *
      NANOSECONDS_PER_MILLISECONDS;
  }
  toCBOR() {
    // TODO: change this to take the minimum amount of space (it always takes 8 bytes now).
    return cbor.value.u64(this._value.toString(16), 16);
  }
  toHash() {
    return (0, candid_1.lebEncode)(this._value);
  }
}
exports.Expiry = Expiry;
/**
 * Create a Nonce transform, which takes a function that returns a Buffer, and adds it
 * as the nonce to every call requests.
 * @param nonceFn A function that returns a buffer. By default uses a semi-random method.
 */
function makeNonceTransform(nonceFn = makeNonce) {
  return async request => {
    // Nonce needs to be inserted into the header for all requests, to enable logs to be correlated with requests.
    const headers = request.request.headers ? new Headers(request.request.headers) : new Headers();
    // TODO: uncomment this when the http proxy supports it.
    // headers.set('X-IC-Request-ID', toHex(new Uint8Array(nonce)));
    request.request.headers = headers;
    // Nonce only needs to be inserted into the body for async calls, to prevent replay attacks.
    if (request.endpoint === 'call' /* Endpoint.Call */) {
      request.body.nonce = nonceFn();
    }
  };
}
exports.makeNonceTransform = makeNonceTransform;
/**
 * Create a transform that adds a delay (by default 5 minutes) to the expiry.
 *
 * @param delayInMilliseconds The delay to add to the call time, in milliseconds.
 */
function makeExpiryTransform(delayInMilliseconds) {
  return async request => {
    request.body.ingress_expiry = new Expiry(delayInMilliseconds);
  };
}
exports.makeExpiryTransform = makeExpiryTransform;
//# sourceMappingURL=transforms.js.map
