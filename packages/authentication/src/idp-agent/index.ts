import * as idpAgentModule from './idp-agent';
import { unsafeTemporaryIdentityProvider } from './idp-agent.test';
import { RedirectTransport } from './transport';

export const { IdentityProviderAgent } = idpAgentModule;
export const authenticator = new IdentityProviderAgent({
  identityProvider: unsafeTemporaryIdentityProvider,
  transport: RedirectTransport({
    location,
  }),
});
