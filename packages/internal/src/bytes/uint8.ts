/**
 * Concatenate multiple Uint8Arrays.
 * @param uint8Arrays The Uint8Arrays to concatenate.
 */
export function concat(...uint8Arrays: Uint8Array[]): Uint8Array {
  const result = new Uint8Array(uint8Arrays.reduce((acc, curr) => acc + curr.byteLength, 0));
  let index = 0;
  for (const b of uint8Arrays) {
    result.set(b, index);
    index += b.byteLength;
  }
  return result;
}

/**
 *
 * @param u1 uint8Array 1
 * @param u2 uint8Array 2
 * @returns number - negative if u1 < u2, positive if u1 > u2, 0 if u1 === u2
 */
export function compare(u1: Uint8Array, u2: Uint8Array): number {
  if (u1.byteLength !== u2.byteLength) {
    return u1.byteLength - u2.byteLength;
  }
  for (let i = 0; i < u1.length; i++) {
    if (u1[i] !== u2[i]) {
      return u1[i] - u2[i];
    }
  }
  return 0;
}

/**
 * Returns a true Uint8Array from an ArrayBufferLike object.
 * @param bufLike a buffer-like object
 * @returns Uint8Array
 */
export function uint8FromBufLike(
  bufLike:
    | ArrayBuffer
    | Uint8Array
    | DataView
    | ArrayBufferView
    | ArrayBufferLike
    | [number]
    | number[]
    | { buffer: ArrayBuffer },
): Uint8Array {
  if (!bufLike) {
    throw new Error('Input cannot be null or undefined');
  }

  if (bufLike instanceof Uint8Array) {
    return bufLike;
  }
  if (bufLike instanceof ArrayBuffer) {
    return new Uint8Array(bufLike);
  }
  if (Array.isArray(bufLike)) {
    return new Uint8Array(bufLike);
  }
  if ('buffer' in bufLike) {
    return uint8FromBufLike(bufLike.buffer);
  }
  return new Uint8Array(bufLike);
}

/**
 * Returns a true ArrayBuffer from a Uint8Array, as Uint8Array.buffer is unsafe.
 * @param {Uint8Array} arr Uint8Array to convert
 * @returns ArrayBuffer
 */
export function uint8ToBuf(arr: Uint8Array): ArrayBuffer {
  const buf = new ArrayBuffer(arr.byteLength);
  const view = new Uint8Array(buf);
  view.set(arr);
  return buf;
}

/**
 * Checks two uint8Arrays for equality.
 * @param u1 uint8Array 1
 * @param u2 uint8Array 2
 * @returns boolean
 */
export function uint8Equals(u1: Uint8Array, u2: Uint8Array): boolean {
  return compare(u1, u2) === 0;
}

/**
 * Helpers to convert a Uint8Array to a DataView.
 * @param uint8 Uint8Array
 * @returns DataView
 */
export function uint8ToDataView(uint8: Uint8Array): DataView {
  if (!(uint8 instanceof Uint8Array)) {
    throw new Error('Input must be a Uint8Array');
  }
  return new DataView(uint8.buffer, uint8.byteOffset, uint8.byteLength);
}
