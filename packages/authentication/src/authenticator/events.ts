import { IdentityDescriptor } from "@dfinity/agent";

export const IdentityChangedEventIdentifier = 'https://internetcomputer.org/ns/authentication/IdentityChangedEvent' as const;

export type IdentityChangedEvent = Readonly<{
    type: typeof IdentityChangedEventIdentifier
    detail: {
        identity: IdentityDescriptor
    }
}>
