import { CustomEventWithDetail, createCustomEvent } from "./CustomEventWithDetail";

export const IdentityRequestedEventIdentifier = 'https://internetcomputer.org/ns/authentication/IdentityRequestedEvent' as const;

/**
 * CustomEvent dispatched by an element notifying others that it depends on an authenticated Identity.
 * `@dfinity/bootstrap`'s IdentityActor will react to this by sending the current identity through the MessagePort as well as each new identity that is changed to after an BootstrapIdentityChangedEvent
 * @param options options
 * @param options.onIdentity - Function that will be called each time the @dfinity/bootstrap window.ic.agent SignIdentity is changed.
 */
export function IdentityRequestedEvent<T>(
    options: Pick<CustomEventInit<T>, 'bubbles' | 'cancelable' | 'composed'> & {
      onIdentity(identity: unknown): void;
    },
  ): CustomEventWithDetail<
    typeof IdentityRequestedEventIdentifier,
    {
      sender: MessagePort;
    }
  > {
    const channel = new MessageChannel();
    const { port1, port2 } = channel;
    port2.onmessage = (event: MessageEvent) => {
      const data = event && event.data;
      const identity = data && data.identity;
      if (!identity) {
        console.warn(`Cannot determine identity from bootstrapIdentityChannel MessageEvent`, { event });
        return;
      }
      options.onIdentity(identity);
    };
    port2.start();
    return createCustomEvent(IdentityRequestedEventIdentifier, {
      ...options,
      detail: {
        sender: port1,
      },
    });
  }
  