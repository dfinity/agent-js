import { SignIdentity } from '@dfinity/agent';

export function IdentityChangedEvent(identity: SignIdentity) {
  return new CustomEvent(IdentityChangedEventIdentifier, {
    detail: {
      identity,
    },
  });
}
export const IdentityChangedEventIdentifier =
  'https://internetcomputer.org/ns/identity/IdentityChangedEvent';
