/* eslint-disable no-constant-condition */
// tslint:disable:no-bitwise
// Note: this file uses buffer-pipe, which on Node only, uses the Node Buffer
//       implementation, which isn't compatible with the NPM buffer package
//       which we use everywhere else. This means that we have to transform
//       one into the other, hence why every function that returns a Buffer
//       actually return `new Buffer(pipe.buffer)`.
// TODO: The best solution would be to have our own buffer type around
//       Uint8Array which is standard.
import { PipeArrayBuffer as Pipe } from './buffer';
import JSBI from 'jsbi';

function eob(): never {
  throw new Error('unexpected end of buffer');
}

/**
 *
 * @param pipe Pipe from buffer-pipe
 * @param num number
 * @returns Buffer
 */
export function safeRead(pipe: Pipe, num: number): ArrayBuffer {
  if (pipe.byteLength < num) {
    eob();
  }
  return pipe.read(num);
}

/**
 * @param pipe
 */
export function safeReadUint8(pipe: Pipe): number {
  const byte = pipe.readUint8();
  if (byte === undefined) {
    eob();
  }
  return byte;
}

/**
 * Encode a positive number (or JSBI) into a Buffer. The number will be floored to the
 * nearest integer.
 * @param value The number to encode.
 */
export function lebEncode(value: JSBI | number | bigint): ArrayBuffer {
  if (!(value instanceof JSBI)) {
    value = JSBI.BigInt(`${value}`);
  }

  if (JSBI.lessThan(value, JSBI.BigInt(0))) {
    throw new Error('Cannot leb encode negative values.');
  }

  const byteLength =
    (JSBI.equal(value, JSBI.BigInt(0)) ? 0 : Math.ceil(Math.log2(JSBI.toNumber(value)))) + 1;
  const pipe = new Pipe(new ArrayBuffer(byteLength), 0);
  while (true) {
    const i = JSBI.toNumber(JSBI.bitwiseAnd(value, JSBI.BigInt(0x7f)));
    value = JSBI.divide(value, JSBI.BigInt(0x80));
    if (JSBI.equal(value, JSBI.BigInt(0))) {
      pipe.write(new Uint8Array([i]));
      break;
    } else {
      pipe.write(new Uint8Array([i | 0x80]));
    }
  }

  return pipe.buffer;
}

/**
 * Decode a leb encoded buffer into a JSBI. The number will always be positive (does not
 * support signed leb encoding).
 * @param pipe A Buffer containing the leb encoded bits.
 */
export function lebDecode(pipe: Pipe): JSBI {
  let weight = JSBI.BigInt(1);
  let value = JSBI.BigInt(0);
  let byte;

  do {
    byte = safeReadUint8(pipe);
    value = JSBI.add(
      value,
      JSBI.multiply(JSBI.bitwiseAnd(JSBI.BigInt(byte), JSBI.BigInt(0x7f)), weight),
    );
    weight = JSBI.multiply(weight, JSBI.BigInt(128));
  } while (byte >= 0x80);

  return value;
}

/**
 * Encode a number (or JSBI) into a Buffer, with support for negative numbers. The number
 * will be floored to the nearest integer.
 * @param value The number to encode.
 */
export function slebEncode(value: JSBI | number | bigint): ArrayBuffer {
  if (!(value instanceof JSBI)) {
    value = JSBI.BigInt(`${value}`);
  }

  const isNeg = JSBI.lessThan(value, JSBI.BigInt(0));
  if (isNeg) {
    value = JSBI.subtract(JSBI.multiply(value, JSBI.BigInt(-1)), JSBI.BigInt(1));
  }
  const byteLength =
    (JSBI.equal(value, JSBI.BigInt(0)) ? 0 : Math.ceil(Math.log2(JSBI.toNumber(value)))) + 1;
  const pipe = new Pipe(new ArrayBuffer(byteLength), 0);
  while (true) {
    const i = getLowerBytes(value);
    value = JSBI.divide(value, JSBI.BigInt(0x80));

    // prettier-ignore
    if (   ( isNeg && JSBI.equal(value, JSBI.BigInt(0)) && (i & 0x40) !== 0)
          || (!isNeg && JSBI.equal(value, JSBI.BigInt(0)) && (i & 0x40) === 0)) {
        pipe.write(new Uint8Array([i]));
        break;
      } else {
        pipe.write(new Uint8Array([i | 0x80]));
      }
  }

  function getLowerBytes(num: JSBI): number {
    const bytes = JSBI.remainder(num, JSBI.BigInt(0x80));
    if (isNeg) {
      // We swap the bits here again, and remove 1 to do two's complement.
      return JSBI.toNumber(JSBI.subtract(JSBI.subtract(JSBI.BigInt(0x80), bytes), JSBI.BigInt(1)));
    } else {
      return JSBI.toNumber(bytes);
    }
  }
  return pipe.buffer;
}

/**
 * Decode a leb encoded buffer into a JSBI. The number is decoded with support for negative
 * signed-leb encoding.
 * @param pipe A Buffer containing the signed leb encoded bits.
 */
export function slebDecode(pipe: Pipe): JSBI {
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
  let value = JSBI.BigInt(0);
  for (let i = bytes.byteLength - 1; i >= 0; i--) {
    value = JSBI.add(
      JSBI.multiply(value, JSBI.BigInt(0x80)),
      JSBI.subtract(JSBI.subtract(JSBI.BigInt(0x80), JSBI.BigInt(bytes[i] & 0x7f)), JSBI.BigInt(1)),
    );
  }
  return JSBI.subtract(JSBI.unaryMinus(value), JSBI.BigInt(1));
}

/**
 *
 * @param value JSBI or number
 * @param byteLength number
 * @returns Buffer
 */
export function writeUIntLE(value: JSBI | number | bigint, byteLength: number): ArrayBuffer {
  if (!(value instanceof JSBI)) {
    value = JSBI.BigInt(`${value}`);
  }

  if (JSBI.lessThan(JSBI.BigInt(value), JSBI.BigInt(0))) {
    throw new Error('Cannot write negative values.');
  }
  return writeIntLE(value, byteLength);
}

/**
 *
 * @param value
 * @param byteLength
 */
export function writeIntLE(value: JSBI | number | bigint, byteLength: number): ArrayBuffer {
  if (!(value instanceof JSBI)) {
    value = JSBI.BigInt(`${value}`);
  }

  const pipe = new Pipe(new ArrayBuffer(Math.min(1, byteLength)), 0);
  let i = 0;
  let mul = JSBI.BigInt(256);
  let sub = JSBI.BigInt(0);
  let byte = JSBI.toNumber(JSBI.remainder(value, mul));
  pipe.write(new Uint8Array([byte]));
  while (++i < byteLength) {
    if (JSBI.lessThan(value, JSBI.BigInt(0)) && JSBI.equal(sub, JSBI.BigInt(0)) && byte !== 0) {
      sub = JSBI.BigInt(1);
    }

    byte = JSBI.toNumber(
      JSBI.remainder(JSBI.subtract(JSBI.divide(value, mul), sub), JSBI.BigInt(256)),
    );
    pipe.write(new Uint8Array([byte]));
    mul = JSBI.multiply(mul, JSBI.BigInt(256));
  }

  return pipe.buffer;
}

/**
 *
 * @param pipe Pipe from buffer-pipe
 * @param byteLength number
 * @returns JSBI
 */
export function readUIntLE(pipe: Pipe, byteLength: number): JSBI {
  let val = JSBI.BigInt(safeReadUint8(pipe));
  let mul = JSBI.BigInt(1);
  let i = 0;
  while (++i < byteLength) {
    mul = JSBI.multiply(mul, JSBI.BigInt(256));
    const byte = JSBI.BigInt(safeReadUint8(pipe));
    val = JSBI.add(val, JSBI.multiply(mul, byte));
  }
  return val;
}

/**
 *
 * @param pipe Pipe from buffer-pipe
 * @param byteLength number
 * @returns JSBI
 */
export function readIntLE(pipe: Pipe, byteLength: number): JSBI {
  let val = readUIntLE(pipe, byteLength);

  const mul = JSBI.exponentiate(
    JSBI.BigInt(2),
    JSBI.add(JSBI.multiply(JSBI.BigInt(8), JSBI.BigInt(byteLength - 1)), JSBI.BigInt(7)),
  );
  if (JSBI.greaterThanOrEqual(val, mul)) {
    val = JSBI.subtract(val, JSBI.multiply(mul, JSBI.BigInt(2)));
  }
  return val;
}
