import { sha224 as jsSha224 } from 'js-sha256';

/**
 * Returns the SHA224 hash of the buffer.
 * @param data Arraybuffer to encode
 */
export function sha224(data: ArrayBuffer): Uint8Array {
  const shaObj = jsSha224.create();
  shaObj.update(data);
  return new Uint8Array(shaObj.array());
}
