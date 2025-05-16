/**
 * Decodes a base64 string into a Uint8Array.
 * @param data - The base64 encoded string to decode
 * @returns A Uint8Array containing the decoded data
 */
export function base64Decode(data: string): Uint8Array {
  // Convert base64 to binary string
  const binaryString = atob(data);

  // Convert binary string to Uint8Array
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  return bytes;
}
