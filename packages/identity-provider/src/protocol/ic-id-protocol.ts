import { PublicKey } from '@dfinity/agent';

/**
 * RP's build this, then (logically) send it to the Identity Provider, then hope for an AuthenticationResponse in return.
 */
export interface IDPAuthenticationRequest {
  sessionIdentity: PublicKey;
  redirectUri: URL;
}
