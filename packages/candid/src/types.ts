import { Buffer } from 'buffer/';
import { lebEncode } from './utils/leb128';

export interface JsonArray extends Array<JsonValue> {
}

export interface JsonObject extends Record<string, JsonValue> {
}

export type JsonValue = boolean | string | number | JsonArray | JsonObject;

// TODO
// Switch back to Uint8Array once hansl/simple-cbor provides deserialization

// Named `BinaryBlob` as opposed to `Blob` so not to conflict with
// https://developer.mozilla.org/en-US/docs/Web/API/Blob
export type BinaryBlob = Buffer & { __BLOB: never };

// A DER encoded blob. This just indicates that the blob is DER encoded.
// It is still fully compatible with a regular BinaryBlob.
export type DerEncodedBlob = BinaryBlob & { __DER_BLOB: never };

export function blobFromBuffer(b: Buffer): BinaryBlob {
  return b as BinaryBlob;
}

export function blobFromUint8Array(arr: Uint8Array): BinaryBlob {
  return Buffer.from(arr) as BinaryBlob;
}

export function blobFromText(text: string): BinaryBlob {
  return Buffer.from(text) as BinaryBlob;
}

export function blobFromUint32Array(arr: Uint32Array): BinaryBlob {
  return Buffer.from(arr) as BinaryBlob;
}

export function derBlobFromBlob(blob: BinaryBlob): DerEncodedBlob {
  return blob as DerEncodedBlob;
}

export function blobFromHex(hex: string): BinaryBlob {
  return Buffer.from(hex, 'hex') as BinaryBlob;
}

export function blobToHex(blob: BinaryBlob): string {
  return blob.toString('hex');
}

export function blobToUint8Array(blob: BinaryBlob): Uint8Array {
  return new Uint8Array(blob.slice(0, blob.byteLength));
}

// A Nonce that can be used for calls.
export type Nonce = BinaryBlob & { __nonce__: void };

/**
 * Create a random Nonce, based on date and a random suffix.
 */
export function makeNonce(): Nonce {
  return lebEncode(
    BigInt(+Date.now()) * BigInt(100000) + BigInt(Math.floor(Math.random() * 100000)),
  ) as Nonce;
}
