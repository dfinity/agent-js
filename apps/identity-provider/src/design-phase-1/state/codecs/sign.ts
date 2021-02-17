import * as t from 'io-ts';

const Ed25519SignerCodec = t.type({
  type: t.literal('Ed25519Signer'),
  credential: t.type({
    secretKey: t.type({
      hex: t.string,
    }),
  }),
});
export type Ed25519Signer = t.TypeOf<typeof Ed25519SignerCodec>;

const WebAuthnIdentitySignerCodec = t.type({
  type: t.literal('WebAuthnIdentitySigner'),
  json: t.string,
});
export type WebAuthnIdentitySigner = t.TypeOf<typeof WebAuthnIdentitySignerCodec>;

export const SignerCodec = t.union([Ed25519SignerCodec, WebAuthnIdentitySignerCodec]);

export type Signer = t.TypeOf<typeof SignerCodec>;
