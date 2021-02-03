import { WebAuthnIdentity } from '@dfinity/authentication';
import { hexEncodeUintArray } from '../../bytes';

/**
 * Polyfill of `WebAuthnIdentity` to use in non-browser environments (no globalThis.navigator)
 */
export default function PolyfillWebAuthnIdentity(): Pick<typeof WebAuthnIdentity, 'create'> {
  return {
    async create() {
      return WebAuthnIdentity.fromJSON(
        JSON.stringify({
          publicKey: hexEncodeUintArray(Uint8Array.from([])),
          rawId: hexEncodeUintArray(Uint8Array.from([])),
        }),
      );
    },
  };
}
