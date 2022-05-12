require('fake-indexeddb/auto');
import { SecureStorage } from './secureStorage';

describe.only('secure storage provider', () => {
  it('should support setting values', async () => {
    const storage = await SecureStorage.create();
    expect(async () => await storage.set('test', 'value')).not.toThrow();
  });
  it('should support getting values', async () => {
    const storage = await SecureStorage.create();
    await storage.set('test', 'value');
    expect(await storage.get('test')).toBe('value');
    expect(await storage.get('unset-value')).toBe(undefined);
  });
  it('should support removing values', async () => {
    const storage = await SecureStorage.create();
    await storage.set('test', 'value');
    expect(await storage.get('test')).toBe('value');
    await storage.remove('test');
    expect(await storage.get('test')).toBe(undefined);
  });
  it.todo('should be compatible with authClient');
});
