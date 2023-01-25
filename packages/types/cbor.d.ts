export type CborValue = ArrayBuffer & {
  __brand: 'CBOR';
};
