import { AnonymousIdentity, IdentityDescriptor, SignIdentity } from '@dfinity/types';
import { toHex } from './utils/buffer';

/**
 * Create an IdentityDescriptor from a @dfinity/identity Identity
 * @param identity - identity describe in returned descriptor
 */
export function createIdentityDescriptor(
  identity: SignIdentity | AnonymousIdentity,
): IdentityDescriptor {
  const identityIndicator: IdentityDescriptor =
    'getPublicKey' in identity
      ? { type: 'PublicKeyIdentity', publicKey: toHex(identity.getPublicKey().toDer()) }
      : { type: 'AnonymousIdentity' };
  return identityIndicator;
}
