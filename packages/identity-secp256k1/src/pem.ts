import { concat, uint8ToBuf } from '@dfinity/agent';
import asn1js from 'asn1js';

const HEADER = `-----BEGIN EC PRIVATE KEY-----`;
const FOOTER = `-----END EC PRIVATE KEY-----`;

/**
 * Parse a PEM-encoded key into an ArrayBuffer
 * @param pem - the PEM-encoded key
 * @returns secret key as an ArrayBuffer
 */
export function pemToSecretKey(pem: string): ArrayBuffer {
  const lines = pem.trim().split('\n');
  const header = lines[0].trim();
  const footer = lines[lines.length - 1].trim();
  if (lines.length < 3) {
    throw new Error('Invalid PEM format');
  }
  if (!header.startsWith(HEADER)) {
    throw new Error('Invalid PEM header');
  }
  if (!footer.startsWith(FOOTER)) {
    throw new Error('Invalid PEM footer');
  }
  const base64Data = lines.slice(1, -1).join('').replace(/\r?\n/g, '');
  const rawKey = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

  /*
   * Rawkey contents:
   * 0:d=0  hl=3 l= 132 cons: SEQUENCE
   * 3:d=1  hl=2 l=   1 prim: INTEGER           :00
   * 6:d=1  hl=2 l=  16 cons: SEQUENCE
   * 8:d=2  hl=2 l=   7 prim: OBJECT            :id-ecPublicKey
   * 17:d=2  hl=2 l=   5 prim: OBJECT            :secp256k1
   * 24:d=1  hl=2 l= 109 prim: OCTET STRING      [HEX DUMP]:....
   */
  parseSequence(rawKey); //?
  asn1js.fromBER(rawKey); //?
  return rawKey.slice(7, 39);
}

interface Asn1Node {
  type: number;
  value: Uint8Array | Asn1Node[];
}

function parseAsn1(data: Uint8Array): Asn1Node | null {
  let offset = 0;

  if (data.length < 2) {
    return null;
  }

  const type = data[offset++];
  let length = data[offset++];

  if (length & 0x80) {
    // Long form length
    const numLengthBytes = length & 0x7f;
    if (data.length < offset + numLengthBytes + length) {
      return null;
    }
    length = 0;
    for (let i = 0; i < numLengthBytes; i++) {
      length = (length << 8) | data[offset++];
    }
  }

  if (data.length < offset + length) {
    return null;
  }

  const value: Asn1Node = { type, value: new Uint8Array(length) };
  data.copyWithin(offset, offset + length, offset + length + offset);

  if (type === 0x30) {
    // Constructed type (sequence)
    value.value = parseSequence(value.value as Uint8Array);
  }

  return value;
}

function parseSequence(data: Uint8Array): Asn1Node[] {
  const nodes: Asn1Node[] = [];
  let offset = 0;

  while (offset < data.length) {
    const node = parseAsn1(data.slice(offset));
    if (node) {
      nodes.push(node);
      offset += (node.value as Uint8Array).byteLength + 2;
    } else {
      break;
    }
  }

  return nodes;
}
