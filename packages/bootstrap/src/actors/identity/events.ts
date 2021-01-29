import { createCustomEvent } from '../../dom-events';
import { IdentityDescriptor } from '@dfinity/agent';

export const BootstrapIdentityChangedEventName = 'https://internetcomputer.org/ns/authentication/BootstrapIdentityChangedEvent' as const;

export type BootstrapIdentityChangedEvent = CustomEvent<IdentityDescriptor> & {
  type: typeof BootstrapIdentityChangedEventName;
};

export function BootstrapIdentityChangedEvent(
  /** Keep this as backward-incompatible data shape, NOT object-with-prototype that will change across versions */
  spec: IdentityDescriptor,
): BootstrapIdentityChangedEvent {
  const event = createCustomEvent(BootstrapIdentityChangedEventName, {
    detail: spec,
    bubbles: true,
    cancelable: true,
  });
  return event;
}
