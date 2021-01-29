import { createCustomEvent } from '../../dom-events';
import { IIdentityDescriptor } from './IdentityDescriptor';

export const BootstrapIdentityChangedEventName = 'https://internetcomputer.org/ns/authentication/BootstrapIdentityChangedEvent' as const;

export type BootstrapIdentityChangedEvent = CustomEvent<IIdentityDescriptor> & {
  type: typeof BootstrapIdentityChangedEventName;
};

export function BootstrapIdentityChangedEvent(
  /** Keep this as backward-incompatible data shape, NOT object-with-prototype that will change across versions */
  spec: IIdentityDescriptor,
): BootstrapIdentityChangedEvent {
  const event = createCustomEvent(BootstrapIdentityChangedEventName, {
    detail: spec,
    bubbles: true,
    cancelable: true,
  });
  return event;
}
