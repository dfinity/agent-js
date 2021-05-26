import { sha224 as jsSha224 } from 'js-sha256';

/**
 *
 * @param data Arraybuffer to encode
 * @returns sha244-encoded BinaryBlob
 */
export function sha224(data: ArrayBuffer): Uint8Array {
  const shaObj = jsSha224.create();
  shaObj.update(data);
  return new Uint8Array(shaObj.array());
}
