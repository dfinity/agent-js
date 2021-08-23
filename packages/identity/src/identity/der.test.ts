import { bufEquals, encodeLenBytes, encodeLen } from './der';

describe('bufEquals tests', () => {
  test('equal buffers', () => {
    const buf1 = Uint8Array.from([0, 0, 0, 1]).buffer;
    const buf2 = Uint8Array.from([0, 0, 0, 1]).buffer;
    expect(bufEquals(buf1, buf2)).toBe(true);
  });
  test('rejects buffers with different lengths', () => {
    const buf1 = Uint8Array.from([0, 0, 0, 0, 1]).buffer;
    const buf2 = Uint8Array.from([0, 0, 0, 1]).buffer;
    expect(bufEquals(buf1, buf2)).toBe(false);
  });
  test('rejects buffers with different values', () => {
    const buf1 = Uint8Array.from([0, 0, 0, 2]).buffer;
    const buf2 = Uint8Array.from([0, 0, 0, 1]).buffer;
    expect(bufEquals(buf1, buf2)).toBe(false);
  });
});

describe('encodeLenBytes', () => {
  test('Length of up to 127', () => {
    const byteLength = Uint8Array.from(new Array(127)).byteLength;
    expect(encodeLenBytes(byteLength)).toEqual(1);
  });
  test('Length of up to 255', () => {
    0x7f < 0xff; //?
    0x7f; //?
    0xff; //?
    0xffff; //?
    0xffffff; //?
    0xff < 0xffff; //?

    const min = Uint8Array.from(new Array(128)).byteLength;
    expect(encodeLenBytes(min)).toEqual(2);
    const max = Uint8Array.from(new Array(255)).byteLength;
    expect(encodeLenBytes(max)).toEqual(2);
  });
  test('Length of up to 65536', () => {
    const min = Uint8Array.from(new Array(256)).byteLength;
    expect(encodeLenBytes(min)).toEqual(3);
    const max = Uint8Array.from(new Array(65535)).byteLength;
    expect(encodeLenBytes(max)).toEqual(3);
  });
  test('Length of up to 16777215', () => {
    // Using numbers directly for performance
    const min = 65536;
    expect(encodeLenBytes(min)).toEqual(4);
    const max = 16777215;
    expect(encodeLenBytes(max)).toEqual(4);
  });
  test('Over maximum length', () => {
    const shouldFail = () => encodeLenBytes(16777216);
    expect(shouldFail).toThrowError('Length too long (> 4 bytes)');
  });
});

describe('encodeLen', () => {
  const buf = Uint8Array.from(new Array(256));
  test('Length of up to 127', () => {
    const min = encodeLen(buf, 0, 1);
    const max = encodeLen(buf, 0, 127);
    expect(min).toEqual(1);
    expect(max).toEqual(1);
  });
  test('Length of up to 255', () => {
    const min = encodeLen(buf, 0, 128);
    const max = encodeLen(buf, 0, 255);
    expect(min).toEqual(2);
    expect(max).toEqual(2);
  });
  test('Length of up to 65535', () => {
    const min = encodeLen(buf, 0, 256);
    const max = encodeLen(buf, 0, 65535);
    expect(min).toEqual(3);
    expect(max).toEqual(3);
  });
  test('Length of up to 16777215', () => {
    const min = encodeLen(buf, 0, 65536);
    const max = encodeLen(buf, 0, 16777215);
    expect(min).toEqual(4);
    expect(max).toEqual(4);
  });
  test('Length of up to 16777215', () => {
    const min = encodeLen(buf, 0, 65536);
    const max = encodeLen(buf, 0, 16777215);
    expect(min).toEqual(4);
    expect(max).toEqual(4);
  });
  test('Over maximum length', () => {
    const shouldFail = () => encodeLen(buf, 0, 16777216);
    expect(shouldFail).toThrowError('Length too long (> 4 bytes)');
  });
});
