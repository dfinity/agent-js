import { createCustomEvent, CustomEventWithDetail } from "./CustomEventWithDetail";

export const AuthenticationResponseUrlDetectedEventIdentifier = 'https://internetcomputer.org/ns/authentication/AuthenticationResponseUrlDetectedEvent' as const;

export type AuthenticationResponseUrlDetectedEvent = {
    type: typeof AuthenticationResponseUrlDetectedEventIdentifier;
    detail: {
      url: URL;
      sign: (challenge: ArrayBuffer) => Promise<ArrayBuffer>
    };
  };

/**
 * @param detail details of event
 */
export function AuthenticationResponseUrlDetectedEvent(
    detail: AuthenticationResponseUrlDetectedEvent['detail']
  ): CustomEventWithDetail<
    typeof AuthenticationResponseUrlDetectedEventIdentifier,
    AuthenticationResponseUrlDetectedEvent['detail']
  > {
    return createCustomEvent(AuthenticationResponseUrlDetectedEventIdentifier, {
      detail,
      bubbles: true,
      cancelable: true,
      composed: true,
    });
  }
  