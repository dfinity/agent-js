import { PublicKey } from '@dfinity/agent';
import { DelegationChain } from '@dfinity/identity';
import { Principal } from '@dfinity/principal';

const DEFAULT_IDENTITY_PROVIDER_URL = 'https://auth.ic0.app/authorize';

function toHexString(bytes: ArrayBuffer): string {
  return new Uint8Array(bytes).reduce((str, byte) => str + byte.toString(16).padStart(2, '0'), '');
}

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

/**
 * List of things to check for a delegation chain validity.
 */
export interface DelegationValidChecks {
  /**
   * Check that the scope is amongst the scopes that this delegation has access to.
   */
  scope?: Principal | string | Array<Principal | string>;
}

/**
 * A parsed access token.
 */
export type AccessToken = string & { _BRAND: 'access_token' };

/**
 * Create a URL that can be used to redirect the browser to request authentication (e.g. using
 * the authentication provider). Will throw if some options are invalid.
 * @param options An option with all options for the authentication request.
 */
export function createAuthenticationRequestUrl(options: CreateUrlOptions): URL {
  const url = new URL(options.identityProvider?.toString() ?? DEFAULT_IDENTITY_PROVIDER_URL);
  url.searchParams.set('response_type', 'token');
  url.searchParams.set('login_hint', toHexString(options.publicKey.toDer()));
  url.searchParams.set('redirect_uri', options.redirectUri ?? _getDefaultLocation());
  url.searchParams.set(
    'scope',
    options.scope
      .map(p => {
        if (typeof p === 'string') {
          return Principal.fromText(p);
        } else {
          return p;
        }
      })
      .map(p => p.toString())
      .join(' '),
  );
  url.searchParams.set('state', '');

  return url;
}

/**
 * Returns an AccessToken from the Window object. This cannot be used in Node, instead use
 * the {@link getAccessTokenFromURL} function.
 *
 * An access token is needed to create a DelegationChain object.
 */
export function getAccessTokenFromWindow(): AccessToken | null {
  if (typeof window === 'undefined') {
    return null;
  }
  return getAccessTokenFromURL(new URL(window.location.href));
}

/**
 * Analyze a URL and try to extract an AccessToken from it.
 * @param url The URL to look into.
 */
export function getAccessTokenFromURL(url: URL | string): AccessToken | null {
  // Remove the `#` at the start.
  const hashParams = new URLSearchParams(new URL(url.toString()).hash.substr(1));
  return hashParams.get('access_token') as AccessToken | null;
}

/**
 * Create a DelegationChain from an AccessToken extracted from a redirect URL.
 * @param accessToken The access token extracted from a redirect URL.
 */
export function createDelegationChainFromAccessToken(accessToken: AccessToken): DelegationChain {
  // Transform the HEXADECIMAL string into the JSON it represents.
  if (/[^0-9a-fA-F]/.test(accessToken) || accessToken.length % 2) {
    throw new Error('Invalid hexadecimal string for accessToken.');
  }
  const chainJson = [...accessToken]
    .reduce((acc, curr, i) => {
      // tslint:disable-next-line:no-bitwise
      acc[(i / 2) | 0] = (acc[(i / 2) | 0] || '') + curr;
      return acc;
    }, [] as string[])
    .map(x => Number.parseInt(x, 16))
    .map(x => String.fromCharCode(x))
    .join('');

  return DelegationChain.fromJSON(chainJson);
}

/**
 * Analyze a DelegationChain and validate that it's valid, ie. not expired and apply to the
 * scope.
 * @param chain The chain to validate.
 * @param checks Various checks to validate on the chain.
 */
export function isDelegationValid(chain: DelegationChain, checks?: DelegationValidChecks): boolean {
  // Verify that the no delegation is expired. If any are in the chain, returns false.
  for (const { delegation } of chain.delegations) {
    // prettier-ignore
    if (+new Date(Number(delegation.expiration / BigInt(1000000))) <= +Date.now()) {
      return false;
    }
  }

  // Check the scopes.
  const scopes: Principal[] = [];
  const maybeScope = checks?.scope;
  if (maybeScope) {
    if (Array.isArray(maybeScope)) {
      scopes.push(...maybeScope.map(s => (typeof s === 'string' ? Principal.fromText(s) : s)));
    } else {
      scopes.push(typeof maybeScope === 'string' ? Principal.fromText(maybeScope) : maybeScope);
    }
  }

  for (const s of scopes) {
    const scope = s.toText();
    for (const { delegation } of chain.delegations) {
      if (delegation.targets === undefined) {
        continue;
      }

      let none = true;
      for (const target of delegation.targets) {
        if (target.toText() === scope) {
          none = false;
          break;
        }
      }
      if (none) {
        return false;
      }
    }
  }

  return true;
}
