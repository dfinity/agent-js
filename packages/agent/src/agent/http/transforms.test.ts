import { Expiry } from './transforms';

jest.useFakeTimers();
test('it should round down to the nearest minute', () => {
  // 2021-04-26T17:47:11.314Z - high precision
  jest.setSystemTime(new Date(1619459231314));

  const expiry = new Expiry(5 * 60 * 1000);
  expect(expiry['_value']).toEqual(BigInt(1619459460000000000));

  const expiry_as_date_string = new Date(
    Number(expiry['_value'] / BigInt(1_000_000)),
  ).toISOString();
  expect(expiry_as_date_string).toBe('2021-04-26T17:51:00.000Z');
});
