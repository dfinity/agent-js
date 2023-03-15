export { Ed25519KeyIdentity, Ed25519PublicKey } from './identity/ed25519.js';
export * from './identity/ecdsa.js';
export * from './identity/delegation.js';
export { WebAuthnIdentity } from './identity/webauthn.js';
export { wrapDER, unwrapDER, DER_COSE_OID, ED25519_OID } from './identity/der.js';

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
