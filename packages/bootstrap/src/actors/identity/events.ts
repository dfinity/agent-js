import { IdentityDescriptor } from '@dfinity/agent';
import { createCustomEvent } from '../../dom-events';

export const BootstrapIdentityChangedEventName = 'https://internetcomputer.org/ns/authentication/BootstrapIdentityChangedEvent' as const;

export type BootstrapIdentityChangedEvent = CustomEvent<IdentityDescriptor> & {
  type: typeof BootstrapIdentityChangedEventName;
};

/**
 * @param identityDescription - description of the identity that has been changed to.
 * Keep this as backward-incompatible data shape,
 * NOT object-with-prototype that will change across versions of these libraries that all
 * need to communicate with each other.
 */
export function BootstrapIdentityChangedEvent(
  identityDescription: IdentityDescriptor,
): BootstrapIdentityChangedEvent {
  const event = createCustomEvent(BootstrapIdentityChangedEventName, {
    detail: identityDescription,
    bubbles: true,
    cancelable: true,
  });
  return event;
}
