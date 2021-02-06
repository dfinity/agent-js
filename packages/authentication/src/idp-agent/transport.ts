import { AuthenticationRequest, createAuthenticationRequestUrl } from '../idp-protocol/request';
import { SignerAvailableEvent, AuthenticationResponseUrlDetectedEvent, AuthenticationResponseUrlDetectedEventIdentifier, createCustomEvent } from '../id-dom-events';
import { makeLog } from '@dfinity/agent';
import { BootstrapChangeIdentityCommand, BootstrapChangeIdentityCommandIdentifier } from '../bootstrap-messages/BootstrapChangeIdentityCommand';

export interface IdentityProviderIndicator {
  url: URL;
}



export type EnvelopeToIdentityProvider = {
  to: IdentityProviderIndicator;
  message: AuthenticationRequest;
};
export type EnvelopeToDocument = {
  to: 'document';
  message:
  | ReturnType<typeof AuthenticationResponseUrlDetectedEvent>
  | ReturnType<typeof SignerAvailableEvent>
  | BootstrapChangeIdentityCommand
  ;
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
 */
export function DomEventTransport(): Transport<EnvelopeToDocument> {
  return Object.freeze({ send });
  /**
   * Send an Envelope to its destination.
   * @param envelope - envelope to send
   */
  async function send(envelope: EnvelopeToDocument) {
    const message = envelope.message;
    const event = (() => {
      switch (message.type) {
        case AuthenticationResponseUrlDetectedEventIdentifier:
          return AuthenticationResponseUrlDetectedEvent(message.detail);
        case BootstrapChangeIdentityCommandIdentifier:
          return createCustomEvent(
            message.type,
            {
              bubbles: true,
              composed: true,
              detail: message.detail,
            },
          )
        default:
          throw Object.assign(new Error('unexpected message.type'), {
            envelope,
          });
      }
    })();
    makeLog('DomEventTransport')('debug', 'dispatching event on document', event)
    globalThis.document.dispatchEvent(event);
  }
}
