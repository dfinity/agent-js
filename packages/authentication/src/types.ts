export type PublicKeyIdentityDescriptor = {
  type: 'PublicKeyIdentity';
  publicKey: string;
};

export type IdentityDescriptor = { type: 'AnonymousIdentity' } | PublicKeyIdentityDescriptor;
