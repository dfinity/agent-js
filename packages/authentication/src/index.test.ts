/**
 * Need this to setup the proper ArrayBuffer type (otherwise in Jest ArrayBuffer isn't
 * an instance of ArrayBuffer).
 * @jest-environment node
 */
import { DelegationChain, Ed25519KeyIdentity } from '@dfinity/identity';
import { isDelegationValid } from './index';

describe('isDelegationValid', () => {
  test('checks expiration', async () => {
    const root = Ed25519KeyIdentity.generate();
    const session = Ed25519KeyIdentity.generate();
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
