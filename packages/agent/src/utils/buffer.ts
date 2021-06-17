import { sha256 as jsSha256 } from 'js-sha256';
/**
 * Utility to map an array buffer to a string
 * @param buffer ArrayBuffer
 * @returns hex-encoded string
 */
export function bufToHex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)].map(x => x.toString(16).padStart(2, '0')).join('');
}

/**
 * Utility to convert a string to Uint8Array
 * @param hexString hex-encoded string
 */
export function hexToUint8(hexString: string): Uint8Array {
  const stringArray = hexString.match(/.{1,2}/g) || [];
  return new Uint8Array(stringArray.map((byte: string) => parseInt(byte, 16)));
}

/**
 * Utility to compare two Uint8Arrays
 * @param a: Uint8Array hex-encoded string
 * @param b: Uint8Array hex-encoded string
 */
export function compareUint8(a: Uint8Array, b: Uint8Array): boolean {
  for (let i = a.length; -1 < i; i -= 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

/**
 * Converts a string to ArrayBuffer
 * @param str string
 * @returns ArrayBuffer
 */
export function strToAB(str: string): ArrayBuffer {
  const buf = new ArrayBuffer(str.length * 2); // 2 bytes for each char
  const bufView = new Uint8Array(buf);
  for (let i = 0, strLen = str.length; i < strLen; i++) {
    bufView[i] = str.charCodeAt(i);
  }
  return buf;
}

/**
 * Creates a new Uint8Array based on two different ArrayBuffers
 *
 * @param buffers ArrayBuffer[]
 * @returns The new ArrayBuffer created from the set.
 */
export function concatBuffers(buffers: ArrayBuffer[]): ArrayBuffer {
  const byteLength = buffers.reduce((prev, current) => prev + current.byteLength, 0);
  let offset = 0;
  return buffers.reduce((prev: Uint8Array, current) => {
    prev.set(new Uint8Array(current), offset);
    offset += current.byteLength;
    return prev;
  }, new Uint8Array(byteLength));
}

/**
 * sha256 hash the provided Buffer
 * @param data - input to hash function
 */
export function hash(data: ArrayBuffer): ArrayBuffer {
  const hashed: ArrayBuffer = jsSha256.create().update(data).arrayBuffer();
  return hashed;
}

/**
 * compare two binary arrays for equality
 * @param {(ArrayBuffer|ArrayBufferView)} a
 * @param {(ArrayBuffer|ArrayBufferView)} b
 */
export function compareBuffers(
  a: ArrayBuffer | ArrayBufferView,
  b: ArrayBuffer | ArrayBufferView,
): boolean {
  if (a instanceof ArrayBuffer) a = new Uint8Array(a, 0);
  if (b instanceof ArrayBuffer) b = new Uint8Array(b, 0);
  if (a.byteLength != b.byteLength) return false;
  return equal8(a as Uint8Array, b as Uint8Array);
}

function equal8(a: Uint8Array, b: Uint8Array) {
  const ua = new Uint8Array(a.buffer, a.byteOffset, a.byteLength);
  const ub = new Uint8Array(b.buffer, b.byteOffset, b.byteLength);
  return compare(ua, ub);
}

function compare(a: ArrayLike<number>, b: ArrayLike<number>) {
  for (let i = a.length; -1 < i; i -= 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}
