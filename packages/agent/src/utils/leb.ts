import { PipeArrayBuffer, lebDecode } from '@dfinity/candid';

export const decodeLeb128 = (buf: ArrayBuffer): bigint => {
  return lebDecode(new PipeArrayBuffer(buf));
};

// time is a LEB128-encoded Nat
export const decodeTime = (buf: ArrayBuffer): Date => {
  const decoded = decodeLeb128(buf);

  // nanoseconds to milliseconds
  return new Date(Number(decoded) / 1_000_000);
};
