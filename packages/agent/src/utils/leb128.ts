// tslint:disable:no-bitwise
// Note: this file uses buffer-pipe, which on Node only, uses the Node Buffer
//       implementation, which isn't compatible with the NPM buffer package
//       which we use everywhere else. This means that we have to transform
//       one into the other, hence why every function that returns a Buffer
//       actually return `new Buffer(pipe.buffer)`.
// TODO: The best solution would be to have our own buffer type around
//       Uint8Array which is standard.
import BigNumber from 'bignumber.js';
import Pipe from 'buffer-pipe';
import { Buffer } from 'buffer/';

export function safeRead(pipe: Pipe, num: number): Buffer {
  if (pipe.buffer.length < num) {
    throw new Error('unexpected end of buffer');
  }
  return pipe.read(num);
}

/**
 * Encode a positive number (or bigint) into a Buffer. The number will be floored to the
 * nearest integer.
 * @param value The number to encode.
 */
export function lebEncode(value: bigint | number): Buffer {
  if (typeof value === 'number') {
    value = BigInt(value);
  }

  if (value < BigInt(0)) {
    throw new Error('Cannot leb encode negative values.');
  }

  const pipe = new Pipe();
  while (true) {
    const i = Number(value & BigInt(0x7f));
    value /= BigInt(0x80);
    if (value === BigInt(0)) {
      pipe.write([i]);
      break;
    } else {
      pipe.write([i | 0x80]);
    }
  }

  return new Buffer(pipe.buffer);
}

/**
 * Decode a leb encoded buffer into a bigint. The number will always be positive (does not
 * support signed leb encoding).
 * @param pipe A Buffer containing the leb encoded bits.
 */
export function lebDecode(pipe: Pipe): bigint {
  let weight = BigInt(1);
  let value = BigInt(0);
  let byte;

  do {
    byte = safeRead(pipe, 1)[0];
    value += BigInt(byte & 0x7f).valueOf() * weight;
    weight *= BigInt(128);
  } while (byte >= 0x80);

  return value;
}

/**
 * Encode a number (or bigint) into a Buffer, with support for negative numbers. The number
 * will be floored to the nearest integer.
 * @param value The number to encode.
 */
export function slebEncode(value: bigint | number): Buffer {
  if (typeof value === 'number') {
    value = BigInt(value);
  }

  const isNeg = value < BigInt(0);
  if (isNeg) {
    value = -value - BigInt(1);
  }
  const pipe = new Pipe();
  while (true) {
    const i = getLowerBytes(value);
    value /= BigInt(0x80);

    // prettier-ignore
    if (   ( isNeg && value === BigInt(0) && (i & 0x40) !== 0)
          || (!isNeg && value === BigInt(0) && (i & 0x40) === 0)) {
        pipe.write([i]);
        break;
      } else {
        pipe.write([i | 0x80]);
      }
  }

  function getLowerBytes(num: bigint): number {
    const bytes = num % BigInt(0x80);
    if (isNeg) {
      // We swap the bits here again, and remove 1 to do two's complement.
      return Number(BigInt(0x80) - bytes - BigInt(1));
    } else {
      return Number(bytes);
    }
  }
  return new Buffer(pipe.buffer);
}

/**
 * Decode a leb encoded buffer into a bigint. The number is decoded with support for negative
 * signed-leb encoding.
 * @param pipe A Buffer containing the signed leb encoded bits.
 */
export function slebDecode(pipe: Pipe): bigint {
  // Get the size of the buffer, then cut a buffer of that size.
  const pipeView = new Uint8Array(pipe.buffer);
  let len = 0;
  for (; len < pipeView.byteLength; len++) {
    if (pipeView[len] < 0x80) {
      // If it's a positive number, we reuse lebDecode.
      if ((pipeView[len] & 0x40) === 0) {
        return lebDecode(pipe);
      }
      break;
    }
  }

  const bytes = new Uint8Array(safeRead(pipe, len + 1));
  let value = BigInt(0);
  for (let i = bytes.byteLength - 1; i >= 0; i--) {
    value = value * BigInt(0x80) + BigInt(0x80 - (bytes[i] & 0x7f) - 1);
  }
  return -value - BigInt(1);
}

export function writeUIntLE(value: bigint | number, byteLength: number): Buffer {
  if (BigInt(value) < BigInt(0)) {
    throw new Error('Cannot write negative values.');
  }
  return writeIntLE(value, byteLength);
}

export function writeIntLE(value: bigint | number, byteLength: number): Buffer {
  value = BigInt(value);

  const pipe = new Pipe();
  let i = 0;
  let mul = BigInt(256);
  let sub = BigInt(0);
  let byte = Number(value % mul);
  pipe.write([byte]);
  while (++i < byteLength) {
    if (value < 0 && sub === BigInt(0) && byte !== 0) {
      sub = BigInt(1);
    }
    byte = Number((value / mul - sub) % BigInt(256));
    pipe.write([byte]);
    mul *= BigInt(256);
  }

  return new Buffer(pipe.buffer);
}

export function readUIntLE(pipe: Pipe, byteLength: number): bigint {
  let val = BigInt(safeRead(pipe, 1)[0]);
  let mul = BigInt(1);
  let i = 0;
  while (++i < byteLength) {
    mul *= BigInt(256);
    const byte = BigInt(safeRead(pipe, 1)[0]);
    val = val + mul * byte;
  }
  return val;
}

export const powTable: Record<number, bigint> = {
  1: BigInt(2 ** 7),
  2: BigInt(2 ** 15),
  4: BigInt(2 ** 31),
  8: BigInt('9223372036854775808' /* 2^63 */),
};
export function readIntLE(pipe: Pipe, byteLength: number): bigint {
  if (!powTable.hasOwnProperty(byteLength)) {
    throw new Error(`${byteLength} byte number not supported`);
  }
  const mul = powTable[byteLength];
  let val = readUIntLE(pipe, byteLength);
  if (val >= mul) {
    val -= mul * BigInt(2);
  }
  return val;
}
