/**
 * @file Since ic-id-protocol is a profile of OAuth2. This file has everything related to OAuth2.
 */

// https://tools.ietf.org/html/rfc6749#section-4.2.2
export type OAuth2AccessTokenResponse = {
  access_token: string; // REQUIRED.  The access token issued by the authorization server.
  token_type: 'bearer'; // default 'bearer' REQUIRED.  The type of the token issued as described in Section 7.1.
  expires_in: number; // The lifetime in seconds of the access token.
  state?: string;
  scope?: string;
}

/**
 * This should be compatible with OAuth 2.0 Authorization Request.
 * But, since it uses underscore keys not camelCase and it's a 'greatest common denominator' of what's really going on, it could be a bit lossy, so it's not necessarily what we want to pass around internally, it's just a standard interop/serialization format of sorts.
 */
export interface OAuth2AuthorizationRequest {
  response_type: string;
  client_id?: string;
  redirect_uri: string;
  scope?: string;
  state?: string;
  /** not in oauth2: see 'ic-id-protocol.md' */
  login_hint: string;
}

/**
 * parse an oauth2 message from a URL query string.
 * @param searchParams parameters of URL query string to parse
 */
export function fromQueryString(
  searchParams: URLSearchParams,
): undefined | OAuth2AccessTokenResponse | OAuth2AuthorizationRequest {
  // console.debug('oauth2.fromQueryString', searchParams.toString(), { scope: searchParams.get('scope') })
  const access_token = searchParams.get('access_token');
  // console.debug('oauth2.fromQueryString', {access_token})
  if (access_token) {
    try {
      return accessTokenResponseFromQueryString(searchParams);
    } catch (error) {
      console.debug('not an accessTokenResponse', error);
    }
  }
  const redirect_uri = searchParams.get('redirect_uri');
  // console.debug('oauth2.fromQueryString', {redirect_uri})

  if (redirect_uri) {
    return authorizationRequestFromQueryString(searchParams);
  }
}

/**
 * Parse on oauth2 AuthorizationRequest from a URL query string.
 * @param searchParams - parameters of URL query string
 */
export function authorizationRequestFromQueryString(
  searchParams: URLSearchParams,
): OAuth2AuthorizationRequest {
  // console.debug('authorizationRequestFromQueryString', { scope: searchParams.get('scope') })
  const login_hint = searchParams.get('login_hint');
  if (!login_hint) {
    throw new Error('login_hint is required');
  }
  const redirect_uri = searchParams.get('redirect_uri');
  if (!redirect_uri) {
    throw new Error('redirect_uri is required');
  }
  const response_type = searchParams.get('response_type') || 'token';
  if (response_type !== 'token') {
    throw new Error('response_type must be token');
  }
  const scope = searchParams.get('scope');
  const authorizationRequest: OAuth2AuthorizationRequest = {
    response_type,
    login_hint,
    redirect_uri,
    ...(scope === null ? {} : { scope }),
  };
  for (const param of ['client_id', 'scope', 'state'] as const) {
    const value = searchParams.get(param);
    if (!value) continue;
    authorizationRequest[param] = value;
  }
  return authorizationRequest;
}

/**
 * @param searchParams - parameters from url query string
 */
export function accessTokenResponseFromQueryString(
  searchParams: URLSearchParams,
): OAuth2AccessTokenResponse {
  const access_token = searchParams.get('access_token');
  if (!access_token) {
    throw new Error('No access_token found.');
  }

  const expires_in = parseInt(searchParams.get('expires_in') || '');
  if (typeof expires_in !== 'number' || !Number.isFinite(expires_in) || expires_in < 1) {
    throw new Error('Invalid expires_in.');
  }

  const token_type = searchParams.get('token_type');
  if (token_type !== 'bearer') {
    throw new Error(`unexpected oauth2 token_type: ${token_type}`);
  }

  const scope = searchParams.get('scope');
  const state = searchParams.get('state');

  const response: OAuth2AccessTokenResponse = {
    access_token,
    expires_in,
    token_type,
    scope,
    state,
  };
  return response;
}
