import * as assert from 'assert';

// https://tools.ietf.org/html/rfc6749#section-4.2.2
export interface OAuth2AccessTokenResponse {
  access_token: string; // REQUIRED.  The access token issued by the authorization server.
  token_type: 'bearer' | 'mac'; // default 'bearer' REQUIRED.  The type of the token issued as described in Section 7.1.
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
  login_hint: string;
  redirect_uri: string;
}

/** Derrive an OAuth2 mesage from a URL Querystring (provided as URLSearchParams instance) */
export function fromQueryString(searchParams: URLSearchParams): OAuth2AccessTokenResponse {
  const access_token = searchParams.get('access_token');
  assert.ok(access_token);

  const expires_in = parseInt(searchParams.get('expires_in') || '');
  assert.equal(typeof expires_in, 'number');
  assert.equal(isNaN(expires_in), false);
  assert.ok(expires_in);

  const token_type = searchParams.get('token_type');
  if (token_type !== 'bearer' && token_type !== 'mac') {
    throw new Error(`unexpected oauth2 token_type: ${token_type}`);
  }

  const response: OAuth2AccessTokenResponse = {
    access_token,
    expires_in,
    token_type,
  };
  return response;
}
