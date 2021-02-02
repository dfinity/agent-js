import * as assert from 'assert';

// https://tools.ietf.org/html/rfc6749#section-4.2.2
export interface OAuth2AccessTokenResponse {
  access_token: string; // REQUIRED.  The access token issued by the authorization server.
  token_type: 'bearer'; // default 'bearer' REQUIRED.  The type of the token issued as described in Section 7.1.
  expires_in: number; // The lifetime in seconds of the access token.
  // @TODO - implement
  state?: any;
  // @TODO - implement
  scope?: any;
}

/**
 * This should be compatible with OAuth 2.0 Authorization Request.
 * But, since it uses underscore keys not camelCase and it's a 'greatest common denominator' of what's really going on, it could be a bit lossy, so it's not necessarily what we want to pass around internally, it's just a standard interop/serialization format of sorts.
 */
export interface OAuth2AuthorizationRequest {
  response_type: 'token';
  client_id?: string;
  redirect_uri: string;
  scope?: string;
  state?: string;
  login_hint: string;
}

/**
 * Derrive an OAuth2 mesage from a URL Querystring (provided as URLSearchParams instance)
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

/** Parse on oauth2 AuthorizationRequest from a URL query string */
export function authorizationRequestFromQueryString(
  searchParams: URLSearchParams,
): OAuth2AuthorizationRequest {
  // console.debug('authorizationRequestFromQueryString', { scope: searchParams.get('scope') })
  const login_hint = searchParams.get('login_hint');
  assert.ok(login_hint, 'login_hint is required');
  const redirect_uri = searchParams.get('redirect_uri');
  assert.ok(redirect_uri, 'redirect_uri is required');
  const response_type = searchParams.get('response_type') || 'token';
  assert.ok(response_type === 'token');
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

export function accessTokenResponseFromQueryString(
  searchParams: URLSearchParams,
): OAuth2AccessTokenResponse {
  const access_token = searchParams.get('access_token');
  assert.ok(access_token);

  const expires_in = parseInt(searchParams.get('expires_in') || '');
  assert.equal(typeof expires_in, 'number');
  assert.equal(isNaN(expires_in), false);
  assert.ok(expires_in);

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
