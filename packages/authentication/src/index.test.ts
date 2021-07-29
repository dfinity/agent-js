/**
 * Need this to setup the proper ArrayBuffer type (otherwise in Jest ArrayBuffer isn't
 * an instance of ArrayBuffer).
 * @jest-environment node
 */
import { SignIdentity } from '@dfinity/agent';
import { DelegationChain, Ed25519KeyIdentity } from '@dfinity/identity';
import { isDelegationValid } from './index';

function createIdentity(seed: number): SignIdentity {
  const seed1 = new Array(32).fill(0);
  seed1[0] = seed;
  return Ed25519KeyIdentity.generate(new Uint8Array(seed1));
}

describe('isDelegationValid', () => {
  test('checks expiration', async () => {
    const root = createIdentity(0);
    const session = createIdentity(1);
    const future = new Date(Date.now() + 1000);
    const past = new Date(Date.now() - 1000);

    // Create a valid delegation.
    expect(
      isDelegationValid(await DelegationChain.create(root, session.getPublicKey(), future)),
    ).toBe(true);
    expect(
      isDelegationValid(await DelegationChain.create(root, session.getPublicKey(), past)),
    ).toBe(false);
  });
});
