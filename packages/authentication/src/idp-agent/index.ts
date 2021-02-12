export { SendAuthenticationRequestCommand } from './idp-agent';
import * as idp from './idp-agent';

/**
 * This Identity Provider is an 'Acceptance Testing' environment operated by DFINITY.
 * It won't always work, but it's the best to use for now.
 * @todo replace this with `https://auth.ic0.app` or similar, once it works.
 */
export const unsafeTemporaryIdentityProvider = {
  url: new URL('https://identity-provider.sdk-test.dfinity.network/design-phase-1'),
};

export const { IdentityProviderAgent } = idp;
