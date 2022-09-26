import 'fake-indexeddb/auto';
import { IdbKeyVal } from './db';

let testCounter = 0;

const testDb = async () => {
  return await IdbKeyVal.create({
    dbName: 'db-' + testCounter,
    storeName: 'store-' + testCounter,
  });
};

beforeEach(() => {
  testCounter += 1;
});

describe('indexeddb wrapper', () => {
  it('should store a basic key value', async () => {
    const db = await testDb();
    const shouldSet = async () => await db.set('testKey', 'testValue');
    expect(shouldSet).not.toThrow();

    expect(await db.get('testKey')).toBe('testValue');
  });
  it('should support removing a value', async () => {
    const db = await testDb();
    await db.set('testKey', 'testValue');

    expect(await db.get('testKey')).toBe('testValue');

    await db.remove('testKey');

    expect(await db.get('testKey')).toBe(null);
  });
});
