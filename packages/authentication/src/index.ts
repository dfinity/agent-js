import { Principal, PublicKey } from '@dfinity/agent';

const DEFAULT_IDENTITY_PROVIDER_URL = 'https://auth.ic0.app/authorize';

function _getDefaultLocation() {
  if (typeof window === 'undefined') {
    throw new Error('Could not find default location.');
  }

  return window.location.origin;
}

/**
 * Options for {@link createAuthenticationRequestUrl}. All these options may be limited
 * further by the identity provider, or an error can happen.
 */
export interface CreateUrlOptions {
  /**
   * The public key to delegate to. This should be the public key of the session key.
   */
  publicKey: PublicKey;

  /**
   * The scope of the delegation. This must contain at least one key and a maximum
   * of four. This is validated in {@link createAuthenticationRequestUrl} but also
   * will be validated as part of the identity provider.
   */
  scope: Array<string | Principal>;

  /**
   * The URI to redirect to, after authentication. By default, `window.location.origin`.
   */
  redirectUri?: string;

  /**
   * The URL base to use for the identity provider.
   * By default, this is "https://auth.ic0.app/authorize".
   */
  identityProvider?: URL | string;
}

export function createAuthenticationRequestUrl(options: CreateUrlOptions): URL {
  const url = new URL(options.identityProvider?.toString() ?? DEFAULT_IDENTITY_PROVIDER_URL);
  url.searchParams.set('response_type', 'token');
  url.searchParams.set('login_hint', options.publicKey.toDer().toString('hex'));
  url.searchParams.set('redirect_uri', options.redirectUri ?? _getDefaultLocation());
  url.searchParams.set('scope', options.scope.map(p => Principal.from(p)).join(' '));
  url.searchParams.set('state', '');
}

export function createDelegationFromAccessToken(accessToken: string): DelegationChain;
export function isDelegationExpired(delegation: DelegationChain): boolean;
export function getAccessTokenFromURL(url: URL): string | null;

