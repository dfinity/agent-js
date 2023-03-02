import { Encoder } from 'cbor';

export const encode = <T>(value: T): Buffer | Uint8Array => {
  const encoder = new Encoder({ collapseBigIntegers: true });
  const encoded = encoder.end(value);
  return encoded.read();
};
