import BigNumber from 'bignumber.js';
import borc from 'borc';
import { Buffer } from 'buffer/';
import { BinaryBlob, blobFromBuffer, blobFromUint8Array, blobToHex } from './types';
import { lebEncode } from './utils/leb128';

export type RequestId = BinaryBlob & { __requestId__: void };
export function toHex(requestId: RequestId): string {
  return blobToHex(requestId);
}

export async function hash(data: Buffer): Promise<BinaryBlob> {
  const hashed: ArrayBuffer = await crypto.subtle.digest(
    {
      name: 'SHA-256',
    },
    data.buffer,
  );
  return blobFromUint8Array(new Uint8Array(hashed));
}

/**
 * Type Guard for BigNumber.js that have a protottype we don't have a reference to, so can't do
 * an `instanceof` check.
 * This can happen in certain sets of dependency graphs for the agent-js-monorepo, e.g. when used
 * by authentication-demo.
 * All this really verifies is the truthiness of the `_isBigNumber` property that the source code
 * defines as protected.
 * @param v - value to check for type=BigNumber.js
 */
function isProbablyBigNumber(v: any): v is BigNumber {
  return v && (v as any)._isBigNumber;
}

async function hashValue(value: unknown): Promise<BinaryBlob> {
  if (value instanceof borc.Tagged) {
    return hashValue(value.value);
  } else if (typeof value === 'string') {
    return hashString(value);
  } else if (
    typeof value === 'bigint' ||
    // In some odd cases, e.g. `Object.assign(BigInt("1"), { a: 1 })` on node@v14.13.1, the result
    // has typeof === 'object', but is still also a BigInt, so also check `instanceof`
    value instanceof BigInt
  ) {
    return hash(lebEncode(value));
  } else if (value instanceof BigNumber) {
    return hash(lebEncode(value) as BinaryBlob);
  } else if (typeof value === 'number') {
    return hash(lebEncode(value));
  } else if (Buffer.isBuffer(value)) {
    return hash(blobFromUint8Array(new Uint8Array(value)));
  } else if (value instanceof Uint8Array || value instanceof ArrayBuffer) {
    return hash(blobFromUint8Array(new Uint8Array(value)));
  } else if (Array.isArray(value)) {
    const vals = await Promise.all(value.map(hashValue));
    return hash(Buffer.concat(vals) as BinaryBlob);
  } else if (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as any).toHash === 'function'
  ) {
    return Promise.resolve((value as any).toHash()).then(x => hashValue(x));
  } else if (value instanceof Promise) {
    return value.then(x => hashValue(x));
  } else if (isProbablyBigNumber(value)) {
    // Do this check much later than the other BigNumber check because this one is much less
    // type-safe.
    // So we want to try all the high-assurance type guards before this 'probable' one.
    return hash(lebEncode(value) as BinaryBlob);
  }
  throw Object.assign(
    new Error(`Attempt to hash a value of unsupported type: ${value}`), {
      // include so logs/callers can understand the confusing value.
      // (when stringified in error message, prototype info is lost)
      value,
    },
  );
}

const hashString = (value: string): Promise<BinaryBlob> => {
  const encoder = new TextEncoder();
  const encoded = encoder.encode(value);
  return hash(Buffer.from(encoded));
};

function concat(bs: BinaryBlob[]): BinaryBlob {
  return blobFromBuffer(Buffer.concat(bs));
}

export async function requestIdOf(request: Record<string, any>): Promise<RequestId> {
  const hashed: Array<Promise<[BinaryBlob, BinaryBlob]>> = Object.entries(request)
    .filter(([_, value]) => value !== undefined)
    .map(async ([key, value]: [string, unknown]) => {
      const hashedKey = await hashString(key);
      const hashedValue = await hashValue(value);

      return [hashedKey, hashedValue] as [BinaryBlob, BinaryBlob];
    });

  const traversed: Array<[BinaryBlob, BinaryBlob]> = await Promise.all(hashed);

  const sorted: Array<[BinaryBlob, BinaryBlob]> = traversed.sort(([k1, v1], [k2, v2]) => {
    return Buffer.compare(Buffer.from(k1), Buffer.from(k2));
  });

  const concatenated: BinaryBlob = concat(sorted.map(concat));
  const requestId = (await hash(concatenated)) as RequestId;
  return requestId;
}
