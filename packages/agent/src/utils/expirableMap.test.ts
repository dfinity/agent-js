import { ExpirableMap } from './expirableMap';

jest.useFakeTimers();
describe('ExpirableMap', () => {
  it('should return undefined if the key is not present', () => {
    const map = new ExpirableMap(10_000);
    expect(map.get('key')).toBeUndefined();
  });
  it('should return a key if one has been recently set', () => {
    const map = new ExpirableMap(10_000);
    map.set('key', 'value');
    expect(map.get('key')).toBe('value');
  });
  it('should return undefined if the key has expired', () => {
    const map = new ExpirableMap(10);
    map.set('key', 'value');
    jest.advanceTimersByTime(11);
    expect(map.get('key')).toBeUndefined();
  });
});
