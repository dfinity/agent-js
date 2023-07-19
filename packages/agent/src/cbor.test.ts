import { Principal } from '@dfinity/principal';
import { decode, encode } from './cbor';
import { toHex } from './utils/buffer';
import JSBI from 'jsbi';

test('round trip', () => {
  interface Data {
    a: number;
    b: string;
    c: ArrayBuffer;
    d: { four: string };
    e: Principal;
    f: ArrayBuffer;
    g: JSBI;
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
    g: JSBI.BigInt('0xffffffffffffffff'),
  };

  const output = decode<Data>(encode(input));

  // Some values don't decode exactly to the value that was encoded,
  // but their hexadecimal representions are the same.
  const { c: inputC, e: inputE, f: inputF, g: inputG, ...inputRest } = input;

  const { c: outputC, e: outputE, f: outputF, g: outputG, ...outputRest } = output;

  expect(toHex(outputC)).toBe(toHex(inputC));
  expect(buf2hex(outputE as any as Uint8Array).toUpperCase()).toBe(inputE.toHex());

  expect(outputG.toString(16)).toBe(inputG.toString(16));
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

function buf2hex(buffer: Uint8Array) {
  // Construct an array such that each number is translated to the
  // hexadecimal equivalent, ensure it is a string and padded then
  // join the elements.
  return Array.prototype.map.call(buffer, x => ('00' + x.toString(16)).slice(-2)).join('');
}
