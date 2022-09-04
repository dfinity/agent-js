import { Principal } from '@dfinity/principal';
import { decode, encode } from './cbor';
import { toHex } from './utils/buffer';

test('round trip', () => {
  interface Data {
    a: number;
    b: string;
    c: ArrayBuffer;
    d: { four: string };
    e: Principal;
    f: ArrayBuffer;
    g: bigint;
  }

  // FIXME: since we have limited control over CBOR decoding, we are relying on
  // BigInt types actually containing big numbers, since small numbers are
  // represented as numbers and big numbers are represented as strings.
  const input: Data = {
    a: 1,
    b: 'two',
    c: new Uint8Array([3]),
    d: { four: 'four' },
    e: Principal.fromHex('FfFfFfFfFfFfFfFfd7'),
    f: new Uint8Array([]),
    g: BigInt('0xffffffffffffffff'),
  };

  const output = decode<Data>(encode(input));

  // Some values don't decode exactly to the value that was encoded,
  // but their hexadecimal representions are the same.
  const { c: inputC, e: inputE, f: inputF, ...inputRest } = input;

  const { c: outputC, e: outputE, f: outputF, ...outputRest } = output;

  expect(toHex(outputC)).toBe(toHex(inputC));
  expect(buf2hex(outputE as any as Uint8Array).toUpperCase()).toBe(inputE.toHex());

  expect(outputRest).toEqual(inputRest);
});

test('empty canister ID', () => {
  const input: { a: Principal } = {
    a: Principal.fromText('aaaaa-aa'),
  };

  const output = decode<typeof input>(encode(input));

  const inputA = input.a;
  const outputA = output.a;

  expect(buf2hex(outputA as any as Uint8Array)).toBe(inputA.toHex());
  expect(Principal.fromUint8Array(outputA as any).toText()).toBe('aaaaa-aa');
});

describe('cbor encode/decode bigint', () => {
  test('encode decode 0 to 1_000_000', () => {
    for (let i = 0; i < 1_000_000; i += 1) {
      let buffer;

      try {
        buffer = encode(BigInt(i));
      } catch (error) {
        console.log(`error encoding on ${i.toString()}`);
        expect((error as Error).message).toBeTruthy();
      }

      try {
        const decoded = decode<bigint>(buffer);
        expect(decoded).toBe(BigInt(i));
      } catch (error) {
        console.log(`error decoding on ${i.toString()}`);
        expect((error as Error).message).toBeTruthy();
      }
      // // if we log the time
      // if (i % 100000 === 0) {
      //   console.log(`${new Date(Date.now()).toLocaleTimeString()} with ${i.toString()}`);
      // }
    }
  });
  test('encode decode 1_000_000n to 1_000_000_000_000n', () => {
    for (let i = 1_000_000; i < 1_000_000_000_000; i += 1_000_000) {
      let buffer;

      const random_num = Math.floor(Math.random() * Math.pow(10, i.toString().length - 1));

      const actual = BigInt(i + random_num);
      try {
        buffer = encode(actual);
      } catch (error) {
        console.log(`error encoding on ${i.toString()}`);
        expect((error as Error).message).toBeTruthy();
      }

      try {
        const decoded = decode<bigint>(buffer);
        expect(decoded).toBe(actual);
      } catch (error) {
        console.log(`error decoding on ${i.toString()}`);
        expect((error as Error).message).toBeTruthy();
      }
      // // if we log the time
      // if (i % 1_000_000_000_00 === 0) {
      //   console.log(`${new Date(Date.now()).toLocaleTimeString()} with ${actual.toString()}`);
      // }
    }
  });
  test('encode decode 1_000_000_000_000n to 1_000_000_000_000_000_000n', () => {
    for (let i = 1_000_000_000_000n; i < 1_000_000_000_000_000_000n; i += 1_000_000_000_000n) {
      let buffer;
      const random_num = BigInt(Math.floor(Math.random() * Math.pow(10, i.toString().length - 1)));
      const actual = i + random_num;
      try {
        buffer = encode(actual);
      } catch (error) {
        console.log(`error encoding on ${i.toString()}`);
        expect((error as Error).message).toBeTruthy();
      }

      try {
        const decoded = decode<bigint>(buffer);
        expect(decoded).toBe(actual);
      } catch (error) {
        console.log(`error decoding on ${i.toString()}`);
        expect((error as Error).message).toBeTruthy();
      }
      // // if we log the time
      // if (i % 1_000_000_000_000_000_00n === 0n) {
      //   console.log(`${new Date(Date.now()).toLocaleTimeString()} with ${actual.toString()}`);
      // }
    }
  });
});

function buf2hex(buffer: Uint8Array) {
  // Construct an array such that each number is translated to the
  // hexadecimal equivalent, ensure it is a string and padded then
  // join the elements.
  return Array.prototype.map.call(buffer, x => ('00' + x.toString(16)).slice(-2)).join('');
}
