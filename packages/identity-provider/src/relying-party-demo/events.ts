import { SignIdentity } from '@dfinity/agent';

/**
 * DOM CustomEvent for relying-party-demo to broadcast a new Identity to other actors listening to the document.
 * This is specific to *this package*, not a well-known event to other `@dfinity/authentication` actors (i.e. BootstrapIdentityChangedEvent is distinct).
 * @param identity - identity to publish with event
 */
export function RelyingPartyDemoIdentityChangedEvent(identity: SignIdentity): CustomEvent {
  return new CustomEvent(RelyingPartyDemoIdentityChangedEventIdentifier, {
    detail: {
      identity,
    },
  });
}
export const RelyingPartyDemoIdentityChangedEventIdentifier =
  'https://relying-party-demo.example.org/ns/identity/RelyingPartyDemoIdentityChangedEvent';
