'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.unwrapDER =
  exports.wrapDER =
  exports.SECP256K1_OID =
  exports.ED25519_OID =
  exports.DER_COSE_OID =
  exports.decodeLen =
  exports.decodeLenBytes =
  exports.encodeLen =
  exports.encodeLenBytes =
  exports.bufEquals =
    void 0;
const bufEquals = (b1, b2) => {
  if (b1.byteLength !== b2.byteLength) return false;
  const u1 = new Uint8Array(b1);
  const u2 = new Uint8Array(b2);
  for (let i = 0; i < u1.length; i++) {
    if (u1[i] !== u2[i]) return false;
  }
  return true;
};
exports.bufEquals = bufEquals;
const encodeLenBytes = len => {
  if (len <= 0x7f) {
    return 1;
  } else if (len <= 0xff) {
    return 2;
  } else if (len <= 0xffff) {
    return 3;
  } else if (len <= 0xffffff) {
    return 4;
  } else {
    throw new Error('Length too long (> 4 bytes)');
  }
};
exports.encodeLenBytes = encodeLenBytes;
const encodeLen = (buf, offset, len) => {
  if (len <= 0x7f) {
    buf[offset] = len;
    return 1;
  } else if (len <= 0xff) {
    buf[offset] = 0x81;
    buf[offset + 1] = len;
    return 2;
  } else if (len <= 0xffff) {
    buf[offset] = 0x82;
    buf[offset + 1] = len >> 8;
    buf[offset + 2] = len;
    return 3;
  } else if (len <= 0xffffff) {
    buf[offset] = 0x83;
    buf[offset + 1] = len >> 16;
    buf[offset + 2] = len >> 8;
    buf[offset + 3] = len;
    return 4;
  } else {
    throw new Error('Length too long (> 4 bytes)');
  }
};
exports.encodeLen = encodeLen;
const decodeLenBytes = (buf, offset) => {
  if (buf[offset] < 0x80) return 1;
  if (buf[offset] === 0x80) throw new Error('Invalid length 0');
  if (buf[offset] === 0x81) return 2;
  if (buf[offset] === 0x82) return 3;
  if (buf[offset] === 0x83) return 4;
  throw new Error('Length too long (> 4 bytes)');
};
exports.decodeLenBytes = decodeLenBytes;
const decodeLen = (buf, offset) => {
  const lenBytes = (0, exports.decodeLenBytes)(buf, offset);
  if (lenBytes === 1) return buf[offset];
  else if (lenBytes === 2) return buf[offset + 1];
  else if (lenBytes === 3) return (buf[offset + 1] << 8) + buf[offset + 2];
  else if (lenBytes === 4)
    return (buf[offset + 1] << 16) + (buf[offset + 2] << 8) + buf[offset + 3];
  throw new Error('Length too long (> 4 bytes)');
};
exports.decodeLen = decodeLen;
/**
 * A DER encoded `SEQUENCE(OID)` for DER-encoded-COSE
 */
exports.DER_COSE_OID = Uint8Array.from([
  ...[0x30, 0x0c],
  ...[0x06, 0x0a],
  ...[0x2b, 0x06, 0x01, 0x04, 0x01, 0x83, 0xb8, 0x43, 0x01, 0x01], // DER encoded COSE
]);
/**
 * A DER encoded `SEQUENCE(OID)` for the Ed25519 algorithm
 */
exports.ED25519_OID = Uint8Array.from([
  ...[0x30, 0x05],
  ...[0x06, 0x03],
  ...[0x2b, 0x65, 0x70], // id-Ed25519 OID
]);
/**
 * A DER encoded `SEQUENCE(OID)` for secp256k1 with the ECDSA algorithm
 */
exports.SECP256K1_OID = Uint8Array.from([
  ...[0x30, 0x10],
  ...[0x06, 0x07],
  ...[0x2a, 0x86, 0x48, 0xce, 0x3d, 0x02, 0x01],
  ...[0x06, 0x05],
  ...[0x2b, 0x81, 0x04, 0x00, 0x0a], // OID secp256k1
]);
/**
 * Wraps the given `payload` in a DER encoding tagged with the given encoded `oid` like so:
 * `SEQUENCE(oid, BITSTRING(payload))`
 *
 * @param payload The payload to encode as the bit string
 * @param oid The DER encoded (and SEQUENCE wrapped!) OID to tag the payload with
 */
function wrapDER(payload, oid) {
  // The Bit String header needs to include the unused bit count byte in its length
  const bitStringHeaderLength = 2 + (0, exports.encodeLenBytes)(payload.byteLength + 1);
  const len = oid.byteLength + bitStringHeaderLength + payload.byteLength;
  let offset = 0;
  const buf = new Uint8Array(1 + (0, exports.encodeLenBytes)(len) + len);
  // Sequence
  buf[offset++] = 0x30;
  // Sequence Length
  offset += (0, exports.encodeLen)(buf, offset, len);
  // OID
  buf.set(oid, offset);
  offset += oid.byteLength;
  // Bit String Header
  buf[offset++] = 0x03;
  offset += (0, exports.encodeLen)(buf, offset, payload.byteLength + 1);
  // 0 padding
  buf[offset++] = 0x00;
  buf.set(new Uint8Array(payload), offset);
  return buf;
}
exports.wrapDER = wrapDER;
/**
 * Extracts a payload from the given `derEncoded` data, and checks that it was tagged with the given `oid`.
 *
 * `derEncoded = SEQUENCE(oid, BITSTRING(payload))`
 *
 * @param derEncoded The DER encoded and tagged data
 * @param oid The DER encoded (and SEQUENCE wrapped!) expected OID
 * @returns The unwrapped payload
 */
const unwrapDER = (derEncoded, oid) => {
  let offset = 0;
  const expect = (n, msg) => {
    if (buf[offset++] !== n) {
      throw new Error('Expected: ' + msg);
    }
  };
  const buf = new Uint8Array(derEncoded);
  expect(0x30, 'sequence');
  offset += (0, exports.decodeLenBytes)(buf, offset);
  if (!(0, exports.bufEquals)(buf.slice(offset, offset + oid.byteLength), oid)) {
    throw new Error('Not the expected OID.');
  }
  offset += oid.byteLength;
  expect(0x03, 'bit string');
  const payloadLen = (0, exports.decodeLen)(buf, offset) - 1; // Subtracting 1 to account for the 0 padding
  offset += (0, exports.decodeLenBytes)(buf, offset);
  expect(0x00, '0 padding');
  const result = buf.slice(offset);
  if (payloadLen !== result.length) {
    throw new Error(
      `DER payload mismatch: Expected length ${payloadLen} actual length ${result.length}`,
    );
  }
  return result;
};
exports.unwrapDER = unwrapDER;
//# sourceMappingURL=der.js.map
