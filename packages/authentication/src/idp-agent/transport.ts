import { AuthenticationRequest, createAuthenticationRequestUrl } from '../idp-protocol/request';

export interface IdentityProviderIndicator {
  url: URL;
}

type AuthenticationResponseUrlDetectedEvent = {
  type: 'AuthenticationResponseUrlDetectedEvent';
  payload: {
    url: URL;
  };
};

export type EnvelopeToIdentityProvider = {
  to: IdentityProviderIndicator;
  message: AuthenticationRequest;
};
export type EnvelopeToDocument = {
  to: 'document';
  message: AuthenticationResponseUrlDetectedEvent;
};
export type IdentityProviderAgentEnvelope = EnvelopeToIdentityProvider | EnvelopeToDocument;

export type Transport<E> = {
  send(e: E): Promise<void>;
};

export function UrlTransport(withUrl: (url: URL) => any): Transport<EnvelopeToIdentityProvider> {
  return Object.freeze({ send });
  async function send(sendable: { to: IdentityProviderIndicator; message: AuthenticationRequest }) {
    const url = createAuthenticationRequestUrl({
      identityProviderUrl: sendable.to.url,
      authenticationRequest: sendable.message,
    });
    withUrl(url);
  }
}

export function RedirectTransport(spec: { location: globalThis.Location }) {
  return UrlTransport(url => {
    spec.location.assign(url.toString());
  });
}

export function BrowserTransport(spec: {
  document: Transport<EnvelopeToDocument>;
  identityProvider: Transport<EnvelopeToIdentityProvider>;
}): Transport<IdentityProviderAgentEnvelope> {
  return Object.freeze({ send });
  async function send(envelope: IdentityProviderAgentEnvelope) {
    switch (envelope.to) {
      case 'document':
        await spec.document.send(envelope);
        break;
      default:
        // IDP
        await spec.identityProvider.send(envelope);
    }
  }
}

export function DomEventTransport(): Transport<EnvelopeToDocument> {
  return Object.freeze({ send });
  async function send(e: EnvelopeToDocument) {
    const message = e.message;
    const event = (() => {
      switch (message.type) {
        case 'AuthenticationResponseUrlDetectedEvent':
          return AuthenticationResponseDetectedEvent(message.payload.url);
        default:
          throw new Error('unexpected message.type');
      }
    })();
    globalThis.document.dispatchEvent(event);
  }
}

export function AuthenticationResponseDetectedEvent(url: URL) {
  return new CustomEvent(
    'https://internetcomputer.org/ns/authentication/AuthenticationResponseDetectedEvent',
    {
      detail: {
        url,
      },
      bubbles: true,
      cancelable: true,
    },
  );
}
