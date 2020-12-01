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

// https://tools.ietf.org/html/rfc6749#section-4.2.2
export interface OAuthAuthenticationResponse {
  redirect_uri: string;
  access_token: string; // REQUIRED.  The access token issued by the authorization server.
  token_type: 'bearer' | 'mac'; // default 'bearer' REQUIRED.  The type of the token issued as described in Section 7.1.
  expires_in: number; // The lifetime in seconds of the access token.
  // @TODO - implement
  state?: any;
  // @TODO - implement
  scope?: any;
}
