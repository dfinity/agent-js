import { base64Decode } from './base64';

function stringToUint8Array(str: string) {
  return new TextEncoder().encode(str);
}

describe('base64Decode', () => {
  it('should decode a simple base64', () => {
    expect(base64Decode('SGVsbG8gV29ybGQ=')).toEqual(stringToUint8Array('Hello World'));
    expect(base64Decode('TWFu')).toEqual(stringToUint8Array('Man'));
    expect(base64Decode('AQID')).toEqual(new Uint8Array([1, 2, 3]));
    expect(base64Decode('AQIDBAUG')).toEqual(new Uint8Array([1, 2, 3, 4, 5, 6]));
  });

  it('should return an empty array for an empty input', () => {
    expect(base64Decode('')).toEqual(new Uint8Array());
  });

  it('should handle padding', () => {
    expect(base64Decode('ZQ==')).toEqual(stringToUint8Array('e'));
    expect(base64Decode('ZWE=')).toEqual(stringToUint8Array('ea'));
    expect(base64Decode('AQIDBA==')).toEqual(new Uint8Array([1, 2, 3, 4]));
    expect(base64Decode('AQIDBAU=')).toEqual(new Uint8Array([1, 2, 3, 4, 5]));
  });

  it('should throw an error for invalid characters', () => {
    expect(() => base64Decode('SGVsbG8*V29ybGQ=')).toThrow();
  });

  it('should throw an error for incorrect padding', () => {
    // 'Man' with incorrect padding
    expect(() => base64Decode('TWFu==')).toThrow();
    expect(() => base64Decode('TWFu=')).toThrow();
  });
});
