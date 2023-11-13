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
      acc[(i / 2) | 0] = (acc[(i / 2) | 0] || '') + curr;
      return acc;
    }, [] as string[])
    .map(x => Number.parseInt(x, 16));

  return new Uint8Array(buffer).buffer;
}
