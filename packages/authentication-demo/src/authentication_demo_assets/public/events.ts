export const BootstrapIdentityChangedEventType = 'https://internetcomputer.org/ns/authentication/BootstrapIdentityChangedEvent' as const;
export const BootstrapIdentityRequestedEventType = 'BootstrapIdentityRequestedEvent' as const;

export type IdentityDescriptor =
| { type: "AnonymousIdentity" }
| { type: "PublicKeyIdentity", publicKey: string }
