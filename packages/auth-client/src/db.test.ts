import { db, getValue, removeValue, setValue } from './db';

describe('indexeddb wrapper', () => {
  it('should store a basic key value', async () => {
    const shouldSet = async () => await setValue(db, 'testValue', 'testKey');
    expect(shouldSet).not.toThrow();

    expect(await getValue(db, 'testKey')).toBe('testValue');
  });
  it('should support removing a value', async () => {
    await setValue(db, 'testValue', 'testKey');
    expect(await getValue(db, 'testKey')).toBe('testValue');

    await removeValue(db, 'testKey');

    expect(await getValue(db, 'testKey')).toBe(undefined);
  });
});
