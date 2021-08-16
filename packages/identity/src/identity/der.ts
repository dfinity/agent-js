const bufEquals = (b1: ArrayBuffer, b2: ArrayBuffer): boolean => {
  if (b1.byteLength !== b2.byteLength) return false;
  const u1 = new Uint8Array(b1);
  const u2 = new Uint8Array(b2);
  for (let i = 0; i < u1.length; i++) {
    if (u1[i] !== u2[i]) return false;
  }
  return true;
};

const encodeLenBytes = (len: number): number => {
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

const encodeLen = (buf: Uint8Array, offset: number, len: number): number => {
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

const decodeLenBytes = (buf: Uint8Array, offset: number): number => {
  if (buf[offset] < 0x80) return 1;
  if (buf[offset] === 0x80) throw new Error('Invalid length 0');
  if (buf[offset] === 0x81) return 2;
  if (buf[offset] === 0x82) return 3;
  if (buf[offset] === 0x83) return 4;
  throw new Error('Length too long (> 4 bytes)');
};

/**
 * A DER encoded `SEQUENCE(OID)` for DER-encoded-COSE
 */
export const DER_COSE_OID = Uint8Array.from([
  ...[0x30, 0x0c], // SEQUENCE
  ...[0x06, 0x0a], // OID with 10 bytes
  ...[0x2b, 0x06, 0x01, 0x04, 0x01, 0x83, 0xb8, 0x43, 0x01, 0x01], // DER encoded COSE
]);

/**
 * A DER encoded `SEQUENCE(OID)` for the Ed25519 algorithm
 */
export const ED25519_OID = Uint8Array.from([
  ...[0x30, 0x05], // SEQUENCE
  ...[0x06, 0x03], // OID with 3 bytes
  ...[0x2b, 0x65, 0x70], // id-Ed25519 OID
]);

/**
 * Wraps the given `payload` in a DER encoding tagged with the given encoded `oid` like so:
 * `SEQUENCE(oid, BITSTRING(payload))`
 *
 * @param payload The payload to encode as the bit string
 * @param oid The DER encoded (and SEQUENCE wrapped!) OID to tag the payload with
 */
export function wrapDER(payload: ArrayBuffer, oid: Uint8Array): Uint8Array {
  // The Bit String header needs to include the unused bit count byte in its length
  const bitStringHeaderLength = 2 + encodeLenBytes(payload.byteLength + 1);
  const len = oid.byteLength + bitStringHeaderLength + payload.byteLength;
  let offset = 0;
  const buf = new Uint8Array(1 + encodeLenBytes(len) + len);
  // Sequence
  buf[offset++] = 0x30;
  // Sequence Length
  offset += encodeLen(buf, offset, len);

  // OID
  buf.set(oid, offset);
  offset += oid.byteLength;

  // Bit String Header
  buf[offset++] = 0x03;
  offset += encodeLen(buf, offset, payload.byteLength + 1);
  // 0 padding
  buf[offset++] = 0x00;
  buf.set(new Uint8Array(payload), offset);

  return buf;
}

/**
 * Extracts a payload from the given `derEncoded` data, and checks that it was tagged with the given `oid`.
 *
 * `derEncoded = SEQUENCE(oid, BITSTRING(payload))`
 *
 * @param derEncoded The DER encoded and tagged data
 * @param oid The DER encoded (and SEQUENCE wrapped!) expected OID
 * @returns The unwrapped payload
 */
export const unwrapDER = (derEncoded: ArrayBuffer, oid: Uint8Array): Uint8Array => {
  let offset = 0;
  const expect = (n: number, msg: string) => {
    if (buf[offset++] !== n) {
      throw new Error('Expected: ' + msg);
    }
  };

  const buf = new Uint8Array(derEncoded);
  expect(0x30, 'sequence');
  offset += decodeLenBytes(buf, offset);

  if (!bufEquals(buf.slice(offset, offset + oid.byteLength), oid)) {
    throw new Error('Not the expected OID.');
  }
  offset += oid.byteLength;

  expect(0x03, 'bit string');
  offset += decodeLenBytes(buf, offset);
  expect(0x00, '0 padding');
  return buf.slice(offset);
};
