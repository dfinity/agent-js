export { Ed25519KeyIdentity, Ed25519PublicKey } from './identity/ed25519';
export * from './identity/ecdsa';
export * from './identity/delegation';
export { WebAuthnIdentity } from './identity/webauthn';
export { wrapDER, unwrapDER, DER_COSE_OID, ED25519_OID } from './identity/der';

/**
 * @deprecated due to size of dependencies. Use `@dfinity/identity-secp256k1` instead.
 */
export class Secp256k1KeyIdentity {
  constructor() {
    throw new Error(
      'Secp256k1KeyIdentity has been moved to a new repo: @dfinity/identity-secp256k1',
    );
  }
}
