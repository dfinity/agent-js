import { AuthenticationRequest, createAuthenticationRequestUrl } from '../idp-protocol/request';

export interface IdentityProviderIndicator {
  url: URL;
}

type Sendable = {
  to: IdentityProviderIndicator;
  message: AuthenticationRequest;
};

type Sender = (s: Sendable) => Promise<void>;

export type Transport = {
  send: Sender;
};

export function UrlTransport(withUrl: (url: URL) => any): Transport {
  return Object.freeze({ send });
  async function send(sendable: { to: IdentityProviderIndicator; message: AuthenticationRequest }) {
    const url = createAuthenticationRequestUrl({
      identityProviderUrl: sendable.to.url,
      authenticationRequest: sendable.message,
    });
    withUrl(url);
  }
}

export function RedirectTransport() {
  return UrlTransport(url => {
    globalThis.location.assign(url.toString());
  });
}
