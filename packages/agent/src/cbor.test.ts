import { Principal } from '@dfinity/principal';
import { bytesToHex } from '@noble/hashes/utils';
import { decode, encode } from './cbor';

test('round trip', () => {
  interface Data {
    a: number;
    b: string;
    c: Uint8Array;
    d: { four: string };
    e: Principal;
    f: Uint8Array;
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
  expect(bytesToHex(outputC)).toBe(bytesToHex(inputC));
  expect(buf2hex(outputE as unknown as Uint8Array).toUpperCase()).toBe(inputE.toHex());
  expect(bytesToHex(outputF)).toBe(bytesToHex(inputF));

  expect(outputRest).toEqual(inputRest);
});

test('empty canister ID', () => {
  const input: { a: Principal } = {
    a: Principal.fromText('aaaaa-aa'),
  };

  const output = decode<typeof input>(encode(input));

  const inputA = input.a;
  const outputA = output.a;

  expect(buf2hex(outputA as unknown as Uint8Array)).toBe(inputA.toHex());
  expect(Principal.fromUint8Array(outputA as unknown as Uint8Array).toText()).toBe('aaaaa-aa');
});

function buf2hex(buffer: Uint8Array) {
  // Construct an array such that each number is translated to the
  // hexadecimal equivalent, ensure it is a string and padded then
  // join the elements.
  return Array.prototype.map.call(buffer, x => ('00' + x.toString(16)).slice(-2)).join('');
}
