export const IdentityRequestedEventUrl = 'https://internetcomputer.org/ns/authentication/IdentityRequestedEvent' as const;

export function IdentityRequestedEvent(
  options: Pick<CustomEventInit<{}>, 'bubbles' | 'cancelable'> & {
    onIdentity(identity: unknown): void;
  },
) {
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
 */
export function createCustomEvent<T, D>(
  type: T,
  options: CustomEventInit<D>,
): CustomEventWithDetail<T, D> {
  const event = new CustomEvent(type as any, options) as CustomEventWithDetail<T, D>;
  return event;
}
