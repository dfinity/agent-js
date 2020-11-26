/**
 * Given a UintArray of bytes, return a string of those byte hex-encoded
 */
export function hexEncodeUintArray(array: Uint8Array | Uint16Array) {
  return Array.prototype.map
    .call(array, (x) => ("00" + x.toString(16)).slice(-2))
    .join("");
}

export function hexDecodeStr(str: string) {

}