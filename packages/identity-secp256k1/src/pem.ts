import { concat, uint8ToBuf } from '@dfinity/agent';

const HEADER = `-----BEGIN`;
const FOOTER = `-----END`;
const ECHEADER = `-----BEGIN EC PRIVATE KEY`;

/**
 * Parse a PEM-encoded key into an ArrayBuffer
 * @param pem - the PEM-encoded key
 * @returns secret key as an ArrayBuffer
 */
export function pemToSecretKey(pem: string): ArrayBuffer {
  const lines = pem.trim().split('\n');
  if (lines.length < 3) {
    throw new Error('Invalid PEM format');
  }
  if (!lines[0].startsWith(HEADER)) {
    throw new Error('Invalid PEM header');
  }
  if (!lines[lines.length - 1].startsWith(FOOTER)) {
    throw new Error('Invalid PEM footer');
  }
  const base64Data = lines.slice(1, -1).join('').replace(/\r?\n/g, '');
  const rawKey = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

  if (pem.startsWith(ECHEADER)) {
    if (rawKey.length !== 118) {
      throw new Error(`Invalid key length ${rawKey.length}. Expected 118 bytes.`);
    } else {
      return rawKey.slice(7, 39);
    }
  }
  if (rawKey.length != 85) {
    throw new Error(`Invalid key length ${rawKey.length}. Expected 85 bytes.`);
  } else {
    return concat(rawKey.slice(16, 48), rawKey.slice(53, 85));
  }

  return uint8ToBuf(rawKey);
}
