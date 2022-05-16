require('fake-indexeddb/auto');
import { Principal } from '../../principal';
import { Secp256k1KeyIdentity, Secp256k1PublicKey } from '../../identity';
import { SecureStorage } from './secureStorage';
import { fromHex } from '@dfinity/agent/src/utils/buffer';

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
  it.only('should store a crypto keypair', async () => {
    const goldenSeed = '8caa0410fa5955c05d6877801806f627e5dd313957a59c70f8d8ef252a482fb2';
    const identity = Secp256k1KeyIdentity.generate(new Uint8Array(fromHex(goldenSeed)));

    const algorithm: KeyAlgorithm = {
      name: 'Ed25519',
    };
    const test = crypto.subtle.importKey(
      'raw',
      identity.getKeyPair().secretKey,
      algorithm,
      false,
      [],
    );

    test; //?

    // const key: CryptoKeyPair = {
    //   privateKey: identity.getKeyPair().secretKey,
    // };
    // const publicKey = crypto.subtle.importKey(
    //   'raw',
    //   identity.getPublicKey().toRaw(),
    //   'EcKeyImportParams',
    //   true,
    //   [],
    // );
  });
  it.todo('should be compatible with authClient');
});
