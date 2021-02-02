import * as idp from './idp-agent';
import { RedirectTransport, BrowserTransport, DomEventTransport } from './transport';

export const unsafeTemporaryIdentityProvider = {
  url: new URL('https://identity-provider.sdk-test.dfinity.network/design-phase-1'),
};

export const { IdentityProviderAgent } = idp;

export const authenticator = new idp.IdentityProviderAgent({
  identityProvider: unsafeTemporaryIdentityProvider,
  transport: BrowserTransport({
    document: DomEventTransport(),
    identityProvider: RedirectTransport(location),
  }),
  location,
});
