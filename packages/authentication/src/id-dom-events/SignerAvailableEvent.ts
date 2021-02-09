import { CustomEventWithDetail, createCustomEvent } from './CustomEventWithDetail';

export const SignerAvailableEventIdentifier = 'https://internetcomputer.org/ns/authentication/SignerAvailableEvent' as const;

type SignFunction = (challenge: ArrayBuffer) => Promise<ArrayBuffer>;

export type SignerAvailableEventDetail = {
  publicKey: {
    hex: string;
  };
  sign: SignFunction;
};

/**
 * CustomEvent dispatched by an element notifying others that it depends on an authenticated Identity.
 * `@dfinity/bootstrap`'s IdentityActor will react to this by sending the current identity through the MessagePort as well as each new identity that is changed to after an BootstrapIdentityChangedEvent
 * @param options options
 * @param options.onIdentity - Function that will be called each time the @dfinity/bootstrap window.ic.agent SignIdentity is changed.
 */
export function SignerAvailableEvent<T>(
  options: Pick<CustomEventInit<T>, 'bubbles' | 'cancelable' | 'composed'> &
    SignerAvailableEventDetail,
): CustomEventWithDetail<typeof SignerAvailableEventIdentifier, SignerAvailableEventDetail> {
  return createCustomEvent(SignerAvailableEventIdentifier, {
    ...options,
    detail: {
      publicKey: options.publicKey,
      sign: options.sign,
    },
  });
}
