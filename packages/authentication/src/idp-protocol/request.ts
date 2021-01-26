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

/** Convert an ic-id-protocol request to an OAuth 2.0 compliant request (just syntax transformation really) */
export function toOauth(idpRequest: AuthenticationRequest): oauth2.OAuth2AuthorizationRequest {
  const login_hint: string = idpRequest.sessionIdentity.hex;
  const redirect_uri: string = idpRequest.redirectUri.toString();
  const oauthRequest: oauth2.OAuth2AuthorizationRequest = {
    response_type: 'token',
    login_hint,
    redirect_uri,
    scope: idpRequest.scope,
    state: idpRequest.state,
  };
  return oauthRequest;
}

/**
 * Create a full URL to submit an AuthenticationRequest to an Identity Provider
 */
export function createAuthenticationRequestUrl(spec: {
  identityProviderUrl: URL;
  authenticationRequest: AuthenticationRequest;
}): URL {
  const url = new URL(spec.identityProviderUrl.toString());
  for (const [key, value] of Object.entries(toOauth(spec.authenticationRequest))) {
    url.searchParams.set(key, value);
  }
  return url;
}
