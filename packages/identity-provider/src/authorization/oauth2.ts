import { ICAuthenticationResponse, OAuthAuthenticationResponse } from 'types/responses';

/**
 * Convert an IC-IDP-internal message to an OAuth2-compliant one.
 * (e.g. to snake_case keys instead of JS-conventional camelCase)
 */
export function toOAuth2(message: ICAuthenticationResponse) {
  const {
    accessToken: access_token,
    expiresIn: expires_in,
    tokenType: token_type,
    redirectURI: redirect_uri,
  } = message;
  const oauth2AccessTokenResponse: OAuthAuthenticationResponse = {
    access_token,
    expires_in,
    token_type,
    redirect_uri,
  };
  return oauth2AccessTokenResponse;
}
