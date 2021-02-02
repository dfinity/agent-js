export const IdentityRequestedEventUrl = 'https://internetcomputer.org/ns/authentication/IdentityRequestedEvent' as const;

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
  typeof IdentityRequestedEventUrl,
  {
    sender: MessagePort;
  }
> {
  const channel = new MessageChannel();
  const { port1, port2 } = channel;
  port2.onmessage = (event: MessageEvent) => {
    console.debug('IdentityRequestedEvent port2.onmessage', event);
    const data = event && event.data;
    const identity = data && data.identity;
    if (!identity) {
      console.warn(`Cannot determine identity from bootstrapIdentityChannel message`);
      return;
    }
    options.onIdentity(identity);
  };
  port1.start();
  port2.start();
  return createCustomEvent(IdentityRequestedEventUrl, {
    ...options,
    detail: {
      sender: port1,
    },
  });
}

export type CustomEventWithDetail<T, D> = CustomEvent<D> & { type: T };

/**
 * Create a CustomEvent with proper typescript awareness of .type
 * @param type - Event Type as a string
 * @param options - Normal CustomEvent option
 */
export function createCustomEvent<T extends string, D>(
  type: T,
  options: CustomEventInit<D>,
): CustomEventWithDetail<T, D> {
  const event = new CustomEvent(type, options) as CustomEventWithDetail<T, D>;
  return event;
}
