import { ExpiryJsonDeserializeErrorCode } from '../../errors.ts';
import { InputError } from '../../errors.ts';
import { Expiry } from './transforms.ts';

jest.useFakeTimers();
test('it should round down to the nearest minute', () => {
  // 2021-04-26T17:47:11.314Z - high precision
  jest.setSystemTime(new Date(1619459231314));

  const expiry = Expiry.fromDeltaInMilliseconds(5 * 60 * 1000);
  expect(expiry['__expiry__']).toEqual(BigInt(1619459460000000000));

  const expiry_as_date_string = new Date(
    Number(expiry['__expiry__'] / BigInt(1_000_000)),
  ).toISOString();
  expect(expiry_as_date_string).toBe('2021-04-26T17:51:00.000Z');
});

test('it should round down to the nearest second if less than 90 seconds', () => {
  // 2021-04-26T17:47:11.314Z - high precision
  jest.setSystemTime(new Date(1619459231314));

  const expiry = Expiry.fromDeltaInMilliseconds(89 * 1000);
  expect(expiry['__expiry__']).toEqual(BigInt(1619459320000000000n));

  const expiry_as_date_string = new Date(
    Number(expiry['__expiry__'] / BigInt(1_000_000)),
  ).toISOString();
  expect(expiry_as_date_string).toBe('2021-04-26T17:48:40.000Z');
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
