import { WebAuthnIdentity } from '@dfinity/authentication';
import { hexEncodeUintArray } from '../../bytes';

export default function PolyfillWebAuthnIdentity() {
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
