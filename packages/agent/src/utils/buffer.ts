/**
 * Concatenate multiple array buffers.
 * @param buffers The buffers to concatenate.
 */
export function concat(...buffers: ArrayBuffer[]): ArrayBuffer {
  const result = new Uint8Array(buffers.reduce((acc, curr) => acc + curr.byteLength, 0));
  let index = 0;
  for (const b of buffers) {
    result.set(new Uint8Array(b), index);
    index += b.byteLength;
  }
  return result.buffer;
}

/**
 * Transforms a buffer to an hexadecimal string. This will use the buffer as an Uint8Array.
 * @param buffer The buffer to return the hexadecimal string of.
 */
export function toHex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)].map(x => x.toString(16).padStart(2, '0')).join('');
}

const hexRe = new RegExp(/^([0-9A-F]{2})*$/i);

/**
 * Transforms a hexadecimal string into an array buffer.
 * @param hex The hexadecimal string to use.
 */
export function fromHex(hex: string): ArrayBuffer {
  if (!hexRe.test(hex)) {
    throw new Error('Invalid hexadecimal string.');
  }
  const buffer = [...hex]
    .reduce((acc, curr, i) => {
      // tslint:disable-next-line:no-bitwise
      acc[(i / 2) | 0] = (acc[(i / 2) | 0] || '') + curr;
      return acc;
    }, [] as string[])
    .map(x => Number.parseInt(x, 16));

  return new Uint8Array(buffer).buffer;
}

export function compare(b1: ArrayBuffer, b2: ArrayBuffer): number {
  if (b1.byteLength !== b2.byteLength) {
    return b1.byteLength - b2.byteLength;
  }

  const u1 = new Uint8Array(b1);
  const u2 = new Uint8Array(b2);
  for (let i = 0; i < u1.length; i++) {
    if (u1[i] !== u2[i]) {
      return u1[i] - u2[i];
    }
  }
  return 0;
}
