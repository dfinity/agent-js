import { Principal } from '@dfinity/principal';
import * as cbor from '@dfinity/cbor';
import { CborDecodeErrorCode, CborEncodeErrorCode, InputError } from './errors';
import { Expiry } from './agent';

function hasCborReplacerMethod(value: unknown): value is { toCborReplacer: () => cbor.CborValue } {
  return typeof value === 'object' && value !== null && 'toCborReplacer' in value;
}

/**
 * Encode a JavaScript value into CBOR.
 * @param value The value to encode
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function encode(value: any): Uint8Array {
  try {
    return cbor.encode(value, value => {
      if (value instanceof Principal) {
        return value.toUint8Array();
      }

      if (value instanceof Expiry) {
        return value.toBigInt();
      }

      if (hasCborReplacerMethod(value)) {
        return value.toCborReplacer();
      }

      return value;
    });
  } catch (error: unknown) {
    throw InputError.fromCode(new CborEncodeErrorCode(error, value));
  }
}

/**
 * Decode a CBOR encoded value into a JavaScript value.
 * @param input The CBOR encoded value
 */
export function decode<T>(input: Uint8Array): T {
  try {
    return cbor.decode(input) as T;
  } catch (error: unknown) {
    throw InputError.fromCode(new CborDecodeErrorCode(error, input));
  }
}
