import { fromHex, PipeArrayBuffer as Pipe, toHex } from './buffer';
import {
  lebDecode,
  lebEncode,
  readIntLE,
  readUIntLE,
  slebDecode,
  slebEncode,
  writeIntLE,
  writeUIntLE,
} from './leb128';

test('leb', () => {
  expect(toHex(lebEncode(0))).toBe('00');
  expect(toHex(lebEncode(7))).toBe('07');
  expect(toHex(lebEncode(127))).toBe('7f');
  expect(() => lebEncode(-1)).toThrow();
  expect(toHex(lebEncode(1))).toBe('01');
  expect(toHex(lebEncode(624485))).toBe('e58e26');
  expect(toHex(lebEncode(BigInt('0x1234567890abcdef1234567890abcdef')))).toBe(
    'ef9baf8589cf959a92deb7de8a929eabb424',
  );
  expect(toHex(lebEncode(BigInt(2000000)))).toBe('80897a');
  expect(toHex(lebEncode(BigInt(60000000000000000)))).toBe('808098f4e9b5ca6a');
  expect(toHex(lebEncode(BigInt(60000000000000000)))).toBe('808098f4e9b5ca6a');

  expect(lebDecode(new Pipe(new Uint8Array([0])))).toBe(BigInt(0));
  expect(lebDecode(new Pipe(new Uint8Array([1])))).toBe(BigInt(1));
  expect(lebDecode(new Pipe(new Uint8Array([0xe5, 0x8e, 0x26])))).toBe(BigInt(624485));
  expect(lebDecode(new Pipe(fromHex('ef9baf8589cf959a92deb7de8a929eabb424'))).toString(16)).toBe(
    '1234567890abcdef1234567890abcdef',
  );
});

test('sleb', () => {
  expect(toHex(slebEncode(-1))).toBe('7f');
  expect(toHex(slebEncode(-123456))).toBe('c0bb78');
  expect(toHex(slebEncode(42))).toBe('2a');
  expect(toHex(slebEncode(BigInt('0x1234567890abcdef1234567890abcdef')))).toBe(
    'ef9baf8589cf959a92deb7de8a929eabb424',
  );
  expect(toHex(slebEncode(-BigInt('0x1234567890abcdef1234567890abcdef')))).toBe(
    '91e4d0faf6b0eae5eda1c8a1f5ede1d4cb5b',
  );
  expect(toHex(slebEncode(BigInt('2000000')))).toBe('8089fa00');
  expect(toHex(slebEncode(BigInt('60000000000000000')))).toBe('808098f4e9b5caea00');

  expect(slebDecode(new Pipe(new Uint8Array([0x7f])))).toBe(BigInt(-1));
  expect(Number(slebDecode(new Pipe(new Uint8Array([0xc0, 0xbb, 0x78]))))).toBe(-123456);
  expect(slebDecode(new Pipe(new Uint8Array([0x2a])))).toBe(BigInt(42));
  expect(slebDecode(new Pipe(fromHex('91e4d0faf6b0eae5eda1c8a1f5ede1d4cb5b'))).toString(16)).toBe(
    '-1234567890abcdef1234567890abcdef',
  );
  expect(slebDecode(new Pipe(fromHex('808098f4e9b5caea00'))).toString()).toBe('60000000000000000');
});

test('IntLE', () => {
  expect(toHex(writeIntLE(42, 2))).toBe('2a00');
  expect(toHex(writeIntLE(-42, 3))).toBe('d6ffff');
  expect(toHex(writeIntLE(1234567890, 5))).toBe('d202964900');
  expect(toHex(writeUIntLE(1234567890, 5))).toBe('d202964900');
  expect(toHex(writeIntLE(-1234567890, 5))).toBe('2efd69b6ff');
  expect(readIntLE(new Pipe(fromHex('d202964900')), 5).toString()).toBe('1234567890');
  expect(readUIntLE(new Pipe(fromHex('d202964900')), 5).toString()).toBe('1234567890');
  expect(readIntLE(new Pipe(fromHex('2efd69b6ff')), 5).toString()).toBe('-1234567890');
  expect(readIntLE(new Pipe(fromHex('d6ffffffff')), 5).toString()).toBe('-42');
  expect(readUIntLE(new Pipe(fromHex('d6ffffffff')), 5).toString()).toBe('1099511627734');
});
