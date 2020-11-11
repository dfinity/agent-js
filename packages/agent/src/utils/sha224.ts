import { sha224 as jsSha224 } from 'js-sha256';
import { BinaryBlob, blobFromUintArray } from '../types';

export function sha224(data: ArrayBuffer): BinaryBlob {
  const shaObj = jsSha224.create();
  shaObj.update(data);
  return blobFromUintArray(new Uint8Array(shaObj.array()));
}
