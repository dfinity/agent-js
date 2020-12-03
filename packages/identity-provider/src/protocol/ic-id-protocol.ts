/**
 * @fileoverview tools for implementing the HTTP-based Internet Computer Identity Protocol, which is mostly a profile of OpenID Connect (OIDC), which is a profile of OAuth2.
 */
import { PublicKey } from '@dfinity/agent';
import { OAuth2AccessTokenResponse } from './oauth2';
import * as oauth2 from './oauth2';

export interface ICAuthenticationResponse {
  redirectURI: string;
  accessToken: string;
  tokenType: 'bearer';
  expiresIn: number;
  // @TODO - implement
  state?: string;
  // @TODO - implement
  scope?: string;
}

/**
 * RP's build this, then (logically) send it to the Identity Provider, then hope for an AuthenticationResponse in return.
 */
export interface IDPAuthenticationRequest {
  sessionIdentity: PublicKey;
  redirectUri: URL;
}

/**
 * Convert an IC-IDP-internal message to an OAuth2-compliant one.e
 * (e.g. to snake_case keys instead of JS-conventional camelCase)
 */
export function toOAuth2(message: ICAuthenticationResponse) {
  const {
    accessToken: access_token,
    expiresIn: expires_in,
    tokenType: token_type,
    redirectURI: redirect_uri,
  } = message;
  const oauth2AccessTokenResponse: OAuth2AccessTokenResponse = {
    access_token,
    expires_in,
    token_type,
    redirect_uri,
  };
  return oauth2AccessTokenResponse;
}

/**
 * Create an ic-id message from a corresponding OAuth2 message
 */
export function fromOAuth2(message: OAuth2AccessTokenResponse) {
  if (message.token_type !== 'bearer') {
    throw new Error(
      `Cannot create ICAuthenticationResponse from non-Bearer token_type OAuth2AccessTokenResponse`,
    );
  }
  const authenticationResponse: ICAuthenticationResponse = {
    accessToken: message.access_token,
    expiresIn: message.expires_in,
    tokenType: message.token_type,
    redirectURI: message.redirect_uri,
  };
  return authenticationResponse;
}

/**
 * Parse a ICAuthenticationResponse from an OAuth2 redirect_uri-targeted querystring.
 */
export function fromQueryString(searchParams: URLSearchParams): ICAuthenticationResponse {
  const oauth2AccessTokenResponse = oauth2.fromQueryString(searchParams);
  const response: ICAuthenticationResponse = fromOAuth2(oauth2AccessTokenResponse);
  return response;
}
