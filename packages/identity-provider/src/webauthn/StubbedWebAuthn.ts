import { WebAuthnIdentity } from '@dfinity/authentication';
import { hexEncodeUintArray } from '../bytes';

export function StubbedWebAuthn() {
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
