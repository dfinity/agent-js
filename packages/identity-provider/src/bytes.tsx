/**
 * Given a UintArray of bytes, return a string of those byte hex-encoded
 */
export function hexEncodeUintArray(array: Uint8Array | Uint16Array) {
  return Array.prototype.map
    .call(array, (x) => ("00" + x.toString(16)).slice(-2))
    .join("");
}


/** Parse a hex-string to Uint8Array of bytes */
export function hexToBytes(hex: string): Uint8Array {
  const octetStringsMatch = hex.match(/.{2}/g);
  if ( ! octetStringsMatch) {
    throw new Error('Expected hex string to match octet pattern, but it didnt')
  }
  const octetStrings = octetStringsMatch.map(s => s.padStart(2, '0'));
  const bytes = octetStrings.map(s => parseInt(s, 16));
  return Uint8Array.from(bytes);
}
