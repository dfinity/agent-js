import { AuthenticationRequest, createAuthenticationRequestUrl } from '../../request';

export const BootstrapChangeIdentityCommandIdentifier = 'https://internetcomputer.org/ns/dfinity/bootstrap/ChangeIdentityCommand' as const;

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

type SignFunction = (challenge: ArrayBuffer) => Promise<ArrayBuffer>;

export type BootstrapChangeIdentityCommandDetail = {
  authenticationResponse: string;
  identity: {
    sign: SignFunction;
  };
};

export type BootstrapChangeIdentityCommand = {
  type: typeof BootstrapChangeIdentityCommandIdentifier;
  detail: BootstrapChangeIdentityCommandDetail;
};

/**
 * URL to call out to for OATH
 */
export interface IdentityProviderIndicator {
  url: URL;
}

export type EnvelopeToIdentityProvider = {
  to: IdentityProviderIndicator;
  message: AuthenticationRequest;
};
export type EnvelopeToDocument = {
  to: 'document';
  message: BootstrapChangeIdentityCommand;
};
export type IdentityProviderAgentEnvelope = EnvelopeToIdentityProvider | EnvelopeToDocument;

export type Transport<E> = {
  send(e: E): Promise<void>;
};

/**
 * Create a transport that sends message to an IdentityProvider by serializing the message to a URL.
 * What you do with the URL is configurable.
 *
 * @param withUrl - function to do something with the message-as-url
 * @returns message transport that sends message as URL
 */
export function UrlTransport(
  withUrl: (url: URL) => void | Promise<void>,
): Transport<EnvelopeToIdentityProvider> {
  return Object.freeze({ send });
  /**
   * @param sendable - addressed envelope containing message
   * @param sendable.to - target destination of the message
   * @param sendable.message - message to send
   */
  async function send(sendable: { to: IdentityProviderIndicator; message: AuthenticationRequest }) {
    const url = createAuthenticationRequestUrl({
      identityProviderUrl: sendable.to.url,
      authenticationRequest: sendable.message,
    });
    withUrl(url);
  }
}

/**
 * Transport that sends messages by converting them to a URL and redirecting this browsing context to the URL.
 * @param location - current browsing context location
 * @returns transport that sends envelopes via redirect
 */
export function RedirectTransport(
  location: Pick<Location, 'assign'>,
): Transport<IdentityProviderAgentEnvelope> {
  return UrlTransport(url => {
    location.assign(url.toString());
  });
}

/**
 * Transport that sends messages to the right place in a web user-agent.
 * It sends to a different transport depending on the target.
 * @param params params
 * @param params.identityProvider - Transport to use when sending messages to an identityProvider
 * @param params.document - Transport to use when sending messages to the web document
 */
export function BrowserTransport(params: {
  document: Transport<EnvelopeToDocument>;
  identityProvider: Transport<EnvelopeToIdentityProvider>;
}): Transport<IdentityProviderAgentEnvelope> {
  return Object.freeze({ send });
  /**
   * Send an Envelope to its destination
   * @param envelope - envelope to send
   */
  async function send(envelope: IdentityProviderAgentEnvelope) {
    console.debug('BrowserTransport.send', envelope);
    switch (envelope.to) {
      case 'document':
        await params.document.send(envelope);
        break;
      default:
        // IDP
        await params.identityProvider.send(envelope);
    }
  }
}

/**
 * Transport that sends messages by dispatching DOM Events
 * @param eventTarget - target of dispatched events
 */
export function DomEventTransport(
  eventTarget: Pick<EventTarget, 'dispatchEvent'>,
): Transport<EnvelopeToDocument> {
  return Object.freeze({ send });
  /**
   * Send an Envelope to its destination.
   * @param envelope - envelope to send
   */
  async function send(envelope: EnvelopeToDocument) {
    const message = envelope.message;
    const event = (() => {
      switch (message.type) {
        case BootstrapChangeIdentityCommandIdentifier:
          return createCustomEvent(message.type, {
            bubbles: true,
            composed: true,
            detail: message.detail,
          });
        default:
          throw Object.assign(new Error('unexpected message.type'), {
            envelope,
          });
      }
    })();
    eventTarget.dispatchEvent(event);
  }
}
