export type IdentityDescriptor =
  | { type: "AnonymousIdentity" }
  | { type: "PublicKeyIdentity"; publicKey: string };
