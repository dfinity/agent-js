import * as oauth2 from './oauth2';

export type AuthenticationRequest = {
  type: 'AuthenticationRequest';
  sessionIdentity: {
    hex: string;
  };
  redirectUri: string;
  state?: string;
  scope: string;
};

/**
 * Convert an ic-id AuthenticationRequest to an oauth2 AuthorizationRequest. It's mostly a syntax transformation of parameter names.
 *
 * @param request - ic-id AuthenticationRequest
 * @returns oauth2 AuthorizationRequest
 */
export function toOauth(request: AuthenticationRequest): oauth2.OAuth2AuthorizationRequest {
  const login_hint: string = request.sessionIdentity.hex;
  const redirect_uri: string = request.redirectUri.toString();
  const oauthRequest: oauth2.OAuth2AuthorizationRequest = {
    response_type: 'token',
    login_hint,
    redirect_uri,
    scope: request.scope,
    state: request.state,
  };
  return oauthRequest;
}

/**
 * Create a full URL to submit an AuthenticationRequest to an Identity Provider
 *
 * @param params - params
 * @param params.identityProviderUrl - URL to an ic-id Identity Provider that can receive AuthenticationRequests
 * @param params.authenticationRequest - ic-id AuthenticationRequest to send to identityProviderUrl
 * @returns URL that, when fetched via HTTP GET, will send the AuthenticationRequest to the identityProviderUrl.
 */
export function createAuthenticationRequestUrl(params: {
  identityProviderUrl: URL;
  authenticationRequest: AuthenticationRequest;
}): URL {
  const url = new URL(params.identityProviderUrl.toString());
  for (const [key, value] of Object.entries(toOauth(params.authenticationRequest))) {
    const valueUriComponent = typeof value === 'undefined' ? '' : value;
    url.searchParams.set(key, valueUriComponent);
  }
  return url;
}
