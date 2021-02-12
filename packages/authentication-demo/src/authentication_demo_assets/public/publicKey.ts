import { hexToBytes, toHex } from "./bytes";
import { blobFromUint8Array, Principal } from "@dfinity/agent";

type PublicKeyFormat = "principal.hex" | "principal.text" | "hex";

/**
 * Format a public key as a string with well-known format.
 * @param format - how to format the publicKey
 * @param publicKeyHex - hex of publicKey bytes
 */
export function formatPublicKey(
  format: PublicKeyFormat,
  publicKeyHex: string
): string {
  const bytes = Uint8Array.from(hexToBytes(publicKeyHex));
  switch (format) {
    case "hex":
      return toHex(bytes);
    case "principal.hex": {
      return toHex(BytesPrincipal(bytes));
    }
    case "principal.text": {
      return BytesPrincipal(bytes).toText();
    }
    default:
      // eslint-disable-next-line @typescript-eslint/no-unused-vars,no-case-declarations
      const x: never = format;
  }
  throw new Error(`unexpected to format provided to formatPublicKey`);
}

function BytesPrincipal(bytes: Uint8Array) {
  return Principal.selfAuthenticating(blobFromUint8Array(bytes));
}
