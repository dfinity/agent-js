import { sha256 } from 'js-sha256';
import { ECDSAKeyIdentity } from './ecdsa';
import { Crypto } from '@peculiar/webcrypto';

const subtle = new Crypto().subtle;

// const subtle = (crypto.webcrypto as unknown as Crypto).subtle;
describe('ECDSAKeyIdentity Tests', () => {
  test('can encode and decode to/from keyPair', async () => {
    const identity = await ECDSAKeyIdentity.generate({ subtleCrypto: subtle });
    const keyPair = identity.getKeyPair();
    const identity2 = await ECDSAKeyIdentity.fromKeyPair(keyPair, subtle);

    expect(await identity.getPublicKey().toDer()).toStrictEqual(
      await identity2.getPublicKey().toDer(),
    );
  });

  test('getKeyPair should return a copy of the key pair', async () => {
    const identity = await ECDSAKeyIdentity.generate({ subtleCrypto: subtle });
    const keyPair = identity.getKeyPair();
    expect(keyPair.publicKey).toBeTruthy();
    expect(keyPair.privateKey).toBeTruthy();
  });

  test('message signature is valid', async () => {
    const identity = await ECDSAKeyIdentity.generate({ subtleCrypto: subtle });
    const message = 'Hello world. ECDSA test here';
    const challenge = new TextEncoder().encode(message);
    const signature = await identity.sign(challenge);
    const hash = sha256.create();
    hash.update(challenge);
    const isValid = await subtle.verify(
      {
        name: 'ECDSA',
        hash: { name: 'SHA-256' },
      },
      identity.getKeyPair().publicKey,
      signature,
      challenge,
    );
    expect(isValid).toBe(true);
  });
});
