import { Expiry } from './transforms';

jest.useFakeTimers();
test('it should round down to the nearest minute', () => {
  // 2021-04-26T17:47:11.314Z - high precision
  jest.setSystemTime(new Date(1619459231314));

  const expiry = Expiry.fromDeltaInMilliseconds(5 * 60 * 1000);
  expect(expiry['_value']).toEqual(BigInt(1619459460000000000));

  const expiry_as_date_string = new Date(
    Number(expiry['_value'] / BigInt(1_000_000)),
  ).toISOString();
  expect(expiry_as_date_string).toBe('2021-04-26T17:51:00.000Z');
});

test('it should round down to the nearest second if less than 90 seconds', () => {
  // 2021-04-26T17:47:11.314Z - high precision
  jest.setSystemTime(new Date(1619459231314));

  const expiry = Expiry.fromDeltaInMilliseconds(89 * 1000);
  expect(expiry['_value']).toEqual(BigInt(1619459320000000000n));

  const expiry_as_date_string = new Date(
    Number(expiry['_value'] / BigInt(1_000_000)),
  ).toISOString();
  expect(expiry_as_date_string).toBe('2021-04-26T17:48:40.000Z');
});

test('should serialize and deserialize expiry', () => {
  const expiry = Expiry.fromDeltaInMilliseconds(1000);
  const json = JSON.stringify(expiry.toJSON());
  const deserialized = Expiry.fromJSON(json);
  expect(deserialized['_value']).toEqual(expiry['_value']);
  expect(deserialized.toString()).toEqual(expiry.toString());

  const invalidJson = '{"_value": "not a number"}';
  expect(() => Expiry.fromJSON(invalidJson)).toThrow();

  const emptyJson = '{}';
  expect(() => Expiry.fromJSON(emptyJson)).toThrow();
});
