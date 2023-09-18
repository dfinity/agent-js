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

function buf2hex(buffer: Uint8Array) {
  // Construct an array such that each number is translated to the
  // hexadecimal equivalent, ensure it is a string and padded then
  // join the elements.
  return Array.prototype.map.call(buffer, x => ('00' + x.toString(16)).slice(-2)).join('');
}

describe('encode + decode numbers', () => {
  it('should handle 0', () => {
    expect(decode(encode(0))).toBe(0);
  });
  it('should handle 1', () => {
    expect(decode(encode(1))).toBe(1);
  });
  it('should handle -1', () => {
    expect(decode(encode(-1))).toBe(-1);
  });
  it('should handle 255', () => {
    expect(decode(encode(255))).toBe(255);
  });
  it('should handle 256', () => {
    expect(decode(encode(256))).toBe(256);
  });
  it('should handle 65535', () => {
    expect(decode(encode(65535))).toBe(65535);
  });
  it('should handle 65536', () => {
    expect(decode(encode(65536))).toBe(65536);
  });
  it('should handle 4294967295', () => {
    expect(decode(encode(4294967295))).toBe(4294967295);
  });
  it('should handle 4294967296', () => {
    expect(decode(encode(4294967296))).toBe(4294967296);
  });
  it('should handle 18446744073709551615n', () => {
    expect(decode(encode(BigInt('18446744073709551615')))).toBe(BigInt('18446744073709551615'));
  });
  it('should encode 0n', () => {
    expect(decode(encode(0n))).toBe(0n);
  });
  it('should encode 1n', () => {
    // Is this valid?
    expect(decode(encode(1n))).toBe(1);
  });
});
