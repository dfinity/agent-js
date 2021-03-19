import { AuthenticationRequest, createAuthenticationRequestUrl } from '../idp-protocol/request';

export interface IdentityProviderIndicator {
  url: URL;
}

export type Envelope<Message extends { type: string },Address> = {
  to: Address;
  message: Message;
}

export type EnvelopeToIdentityProvider = {
  to: IdentityProviderIndicator;
  message: AuthenticationRequest;
};

export type IdentityProviderAgentEnvelope = EnvelopeToIdentityProvider;

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
 */
export function BrowserTransport(params: {
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
      default:
        // IDP
        await params.identityProvider.send(envelope);
    }
  }
}
