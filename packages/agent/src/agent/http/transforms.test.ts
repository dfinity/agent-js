import { ExpiryJsonDeserializeErrorCode, InputError } from '../../errors.ts';
import { Expiry } from './transforms.ts';

const SECONDS_PER_MINUTE = 60;
const MILLISECONDS_PER_SECOND = 1_000;
const NANOSECONDS_PER_MILLISECOND = BigInt(1_000_000);

jest.useFakeTimers();
test('it should round down to the nearest minute', () => {
  // 2021-04-26T17:47:11.314Z - high precision
  jest.setSystemTime(new Date(1619459231314));

  const expiry = Expiry.fromDeltaInMilliseconds(5 * SECONDS_PER_MINUTE * MILLISECONDS_PER_SECOND);
  expect(expiry['__expiry__']).toEqual(BigInt(1619459520000) * NANOSECONDS_PER_MILLISECOND);

  const expiryDate = new Date(Number(expiry['__expiry__'] / NANOSECONDS_PER_MILLISECOND));
  expect(expiryDate.toISOString()).toBe('2021-04-26T17:52:00.000Z');
});

test('it should round down to the nearest second if less than 90 seconds', () => {
  // 2021-04-26T17:47:11.314Z - high precision
  jest.setSystemTime(new Date(1619459231314));

  const expiry = Expiry.fromDeltaInMilliseconds(89 * MILLISECONDS_PER_SECOND);
  expect(expiry['__expiry__']).toEqual(BigInt(1619459320000) * NANOSECONDS_PER_MILLISECOND);

  const expiryDate = new Date(Number(expiry['__expiry__'] / NANOSECONDS_PER_MILLISECOND));
  expect(expiryDate.toISOString()).toBe('2021-04-26T17:48:40.000Z');
});

test('should serialize and deserialize expiry', () => {
  const expiry = Expiry.fromDeltaInMilliseconds(1000);
  const json = JSON.stringify(expiry.toJSON());
  const deserialized = Expiry.fromJSON(json);

  expect.assertions(8);
  expect(deserialized['__expiry__']).toEqual(expiry['__expiry__']);
  expect(deserialized.toString()).toEqual(expiry.toString());

  const invalidJson = '{"__expiry__": "not a number"}';
  try {
    Expiry.fromJSON(invalidJson);
  } catch (error) {
    expect(error).toBeInstanceOf(InputError);
    const inputError = error as InputError;
    expect(inputError.cause.code).toBeInstanceOf(ExpiryJsonDeserializeErrorCode);
    expect(inputError.message).toContain('Not a valid BigInt');
  }

  const emptyJson = '{}';
  try {
    Expiry.fromJSON(emptyJson);
  } catch (error) {
    expect(error).toBeInstanceOf(InputError);
    const inputError = error as InputError;
    expect(inputError.cause.code).toBeInstanceOf(ExpiryJsonDeserializeErrorCode);
    expect(inputError.message).toContain('The input does not contain the key __expiry__');
  }
});

test('isExpiry', () => {
  expect(Expiry.isExpiry(Expiry.fromDeltaInMilliseconds(1000))).toBe(true);
  const jsonExpiryString = JSON.stringify(Expiry.fromDeltaInMilliseconds(1000).toJSON());
  expect(Expiry.isExpiry(Expiry.fromJSON(jsonExpiryString))).toBe(true);
  expect(Expiry.isExpiry({ _isExpiry: true, __expiry__: BigInt(1000) })).toBe(true);

  expect(Expiry.isExpiry({ _isExpiry: true, __expiry__: 1 })).toBe(false);
  expect(Expiry.isExpiry({ _isExpiry: true })).toBe(false);
  expect(Expiry.isExpiry({ _isExpiry: true, __expiry__: 'not a bigint' })).toBe(false);
  expect(Expiry.isExpiry({ _isExpiry: true, __expiry__: new Uint8Array([0x04]) })).toBe(false);
  expect(Expiry.isExpiry({ _isExpiry: true, __expiry__: new ArrayBuffer(1) })).toBe(false);
  expect(Expiry.isExpiry({ _isExpiry: true, __expiry__: null })).toBe(false);
  expect(Expiry.isExpiry(jsonExpiryString)).toBe(false);
  expect(Expiry.isExpiry({})).toBe(false);
  expect(Expiry.isExpiry(new Uint8Array([0x04]))).toBe(false);
  expect(Expiry.isExpiry('')).toBe(false);
  expect(Expiry.isExpiry(null)).toBe(false);
});

describe('addMilliseconds', () => {
  test('should add positive milliseconds to expiry', () => {
    const originalExpiry = Expiry.fromDeltaInMilliseconds(1000);
    const originalValue = originalExpiry['__expiry__'];

    const addedExpiry = originalExpiry.addMilliseconds(500);

    expect(addedExpiry['__expiry__']).toEqual(
      originalValue + BigInt(500) * NANOSECONDS_PER_MILLISECOND,
    );
    expect(addedExpiry).not.toBe(originalExpiry); // Should return a new instance
  });

  test('should add zero milliseconds correctly', () => {
    const originalExpiry = Expiry.fromDeltaInMilliseconds(1000);
    const originalValue = originalExpiry['__expiry__'];

    const addedExpiry = originalExpiry.addMilliseconds(0);

    expect(addedExpiry['__expiry__']).toEqual(originalValue);
    expect(addedExpiry).not.toBe(originalExpiry); // Should still return a new instance
  });

  test('should handle negative milliseconds', () => {
    const originalExpiry = Expiry.fromDeltaInMilliseconds(1000);
    const originalValue = originalExpiry['__expiry__'];

    const addedExpiry = originalExpiry.addMilliseconds(-300);

    expect(addedExpiry['__expiry__']).toEqual(
      originalValue - BigInt(300) * NANOSECONDS_PER_MILLISECOND,
    );
  });

  test('should handle large millisecond values', () => {
    const originalExpiry = Expiry.fromDeltaInMilliseconds(1000);
    const originalValue = originalExpiry['__expiry__'];

    const largeMs = Number.MAX_SAFE_INTEGER;
    const addedExpiry = originalExpiry.addMilliseconds(largeMs);

    expect(addedExpiry['__expiry__']).toEqual(
      originalValue + BigInt(largeMs) * NANOSECONDS_PER_MILLISECOND,
    );
  });

  test('should preserve expiry properties in returned object', () => {
    const originalExpiry = Expiry.fromDeltaInMilliseconds(1000);

    const addedExpiry = originalExpiry.addMilliseconds(500);

    expect(addedExpiry._isExpiry).toEqual(true);
    expect(typeof addedExpiry['__expiry__']).toEqual('bigint');
    expect(Expiry.isExpiry(addedExpiry)).toEqual(true);
  });

  test('should work with chained calls', () => {
    const originalExpiry = Expiry.fromDeltaInMilliseconds(1000);

    const chainedExpiry = originalExpiry
      .addMilliseconds(100)
      .addMilliseconds(200)
      .addMilliseconds(300);

    const expectedValue =
      originalExpiry['__expiry__'] + BigInt(100 + 200 + 300) * NANOSECONDS_PER_MILLISECOND;

    expect(chainedExpiry['__expiry__']).toEqual(expectedValue);
    expect(originalExpiry.toBigInt()).not.toEqual(chainedExpiry.toBigInt());
    expect(chainedExpiry).not.toBe(originalExpiry); // Should return a new instance
  });

  test('should maintain immutability of original expiry', () => {
    const originalExpiry = Expiry.fromDeltaInMilliseconds(1000);
    const originalValue = originalExpiry['__expiry__'];

    originalExpiry.addMilliseconds(500);

    // Original expiry should remain unchanged
    expect(originalExpiry['__expiry__']).toEqual(originalValue);
  });
});
