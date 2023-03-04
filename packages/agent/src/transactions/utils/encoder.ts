import { Encoder } from 'cbor';

/**
 * Encodes an object into CBOR
 * This function depends on `cbor` because of its option to collapseBigIntegers.
 * Transactions must be encoded with bigInt values, rather than something like BigNumber
 * representation, for the bytes to match the Rosetta implimentation output.
 * @param value T the object to encode.
 */
export const encode = <T>(value: T): Buffer | Uint8Array => {
  const encoder = new Encoder({ collapseBigIntegers: true });
  const encoded = encoder.end(value);
  return encoded.read();
};
