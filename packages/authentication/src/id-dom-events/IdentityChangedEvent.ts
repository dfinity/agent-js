import { createCustomEvent, CustomEventWithDetail } from './CustomEventWithDetail';
import { IdentityDescriptor } from '@dfinity/agent';

export const IdentityChangedEventIdentifier = 'https://internetcomputer.org/ns/authentication/IdentityChangedEvent' as const;

export type IdentityChangedEvent = {
  type: typeof IdentityChangedEventIdentifier;
  detail: {
    identity: IdentityDescriptor
  };
};

/**
 * @param detail details of event
 */
export function IdentityChangedEvent(
  detail: IdentityChangedEvent['detail'],
): CustomEventWithDetail<
  typeof IdentityChangedEventIdentifier,
  IdentityChangedEvent['detail']
> {
  return createCustomEvent(IdentityChangedEventIdentifier, {
    detail,
    bubbles: true,
    cancelable: true,
    composed: true,
  });
}
