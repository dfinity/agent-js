'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.makeNonce = exports.SubmitRequestType = void 0;
// tslint:enable:camel-case
// The types of values allowed in the `request_type` field for submit requests.
var SubmitRequestType;
(function (SubmitRequestType) {
  SubmitRequestType['Call'] = 'call';
})((SubmitRequestType = exports.SubmitRequestType || (exports.SubmitRequestType = {})));
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
//# sourceMappingURL=types.js.map
