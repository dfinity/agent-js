// tslint:disable:max-classes-per-file
// This file is based on:
// tslint:disable-next-line: max-line-length
// https://github.com/dfinity-lab/dfinity/blob/9bca65f8edd65701ea6bdb00e0752f9186bbc893/docs/spec/public/index.adoc#cbor-encoding-of-requests-and-responses
import borc from 'borc';
import * as cbor from 'simple-cbor';
import { CborEncoder, SelfDescribeCborSerializer } from 'simple-cbor';
import { Principal } from '@dfinity/principal';
import { concat, fromHex } from './utils/buffer';

// We are using hansl/simple-cbor for CBOR serialization, to avoid issues with
// encoding the uint64 values that the HTTP handler of the client expects for
// canister IDs. However, simple-cbor does not yet provide deserialization so
// we are using `Uint8Array` so that we can use the dignifiedquire/borc CBOR
// decoder.

class PrincipalEncoder implements CborEncoder<Principal> {
  public get name() {
    return 'Principal';
  }

  public get priority() {
    return 0;
  }

  public match(value: any): boolean {
    return value && value._isPrincipal === true;
  }

  public encode(v: Principal): cbor.CborValue {
    return cbor.value.bytes(v.toUint8Array());
  }
}

class BufferEncoder implements CborEncoder<ArrayBuffer> {
  public get name() {
    return 'Buffer';
  }

  public get priority() {
    return 1;
  }

  public match(value: any): boolean {
    return value instanceof ArrayBuffer || ArrayBuffer.isView(value);
  }

  public encode(v: ArrayBuffer): cbor.CborValue {
    return cbor.value.bytes(new Uint8Array(v));
  }
}

class BigIntEncoder implements CborEncoder<BigInt> {
  public get name() {
    return 'BigInt';
  }

  public get priority() {
    return 1;
  }

  public match(value: any): boolean {
    return typeof value === `bigint`;
  }

  public encode(v: bigint): cbor.CborValue {
    // Always use a bigint encoding.
    if (v > BigInt(0)) {
      return cbor.value.tagged(2, cbor.value.bytes(fromHex(v.toString(16))));
    } else {
      return cbor.value.tagged(3, cbor.value.bytes(fromHex((BigInt('-1') * v).toString(16))));
    }
  }
}

const serializer = SelfDescribeCborSerializer.withDefaultEncoders(true);
serializer.addEncoder(new PrincipalEncoder());
serializer.addEncoder(new BufferEncoder());
serializer.addEncoder(new BigIntEncoder());

export enum CborTag {
  Uint64LittleEndian = 71,
  Semantic = 55799,
}

/**
 * Encode a JavaScript value into CBOR.
 */
export function encode(value: any): ArrayBuffer {
  return serializer.serialize(value);
}

function decodePositiveBigInt(buf: Uint8Array): bigint {
  const len = buf.byteLength;
  let res = BigInt(0);
  for (let i = 0; i < len; i++) {
    // tslint:disable-next-line:no-bitwise
    res = res * BigInt(0x100) + BigInt(buf[i]);
  }

  return res;
}

// A BORC subclass that decodes byte strings to ArrayBuffer instead of the Buffer class.
class Uint8ArrayDecoder extends borc.Decoder {
  public createByteString(raw: ArrayBuffer[]): ArrayBuffer {
    return concat(...raw);
  }

  public createByteStringFromHeap(start: number, end: number): ArrayBuffer {
    if (start === end) {
      return new ArrayBuffer(0);
    }

    return new Uint8Array((this as any)._heap.slice(start, end));
  }
}

export function decode<T>(input: ArrayBuffer): T {
  const buffer = new Uint8Array(input);
  const decoder = new Uint8ArrayDecoder({
    size: buffer.byteLength,
    tags: {
      // Override tags 2 and 3 for BigInt support (borc supports only BigNumber).
      2: val => decodePositiveBigInt(val),
      3: val => -decodePositiveBigInt(val),
      [CborTag.Semantic]: (value: T): T => value,
    },
  });

  return decoder.decodeFirst(buffer);
}
