import {
  Transport,
  BrowserTransport,
  EnvelopeToIdentityProvider,
  RedirectTransport,
  IdentityProviderIndicator,
} from '../idp-agent/transport';
import { IdentityProviderAgent, SendAuthenticationRequestCommand } from '../idp-agent/idp-agent';
import { unsafeTemporaryIdentityProvider } from '../idp-agent';

export interface IAuthenticator {
  sendAuthenticationRequest: IdentityProviderAgent['sendAuthenticationRequest'];
}

export type AuthenticatorEnvelope = EnvelopeToIdentityProvider

interface AuthenticatorOptions {
  transport?: Transport<AuthenticatorEnvelope>;
  identityProvider?: IdentityProviderIndicator;
  events?: EventTarget;
}

export class Authenticator implements IAuthenticator {
  #identityProviderAgent: IdentityProviderAgent;
  #transport: Transport<AuthenticatorEnvelope>;
  #events: EventTarget = document;

  constructor(options: AuthenticatorOptions = {}) {
    this.#events = options.events ?? document;
    this.#transport = options.transport ?? DefaultAuthenticatorTransport();
    this.#identityProviderAgent = new IdentityProviderAgent({
      transport: this.#transport,
      identityProvider: options.identityProvider ?? unsafeTemporaryIdentityProvider,
      location: location,
    });
  }
  /**
   * Send an ic-id-protocol.AuthenticationRequest to an Identity Provider (IDP).
   * Usually this happens by serializing the request as a query string and redirecting to the
   * identityProvider url with the query string appended.
   * @param command SendAuthenticationRequestCommand
   */
  public async sendAuthenticationRequest(command: SendAuthenticationRequestCommand): Promise<void> {
    return this.#identityProviderAgent.sendAuthenticationRequest(command);
  }
}

/**
 * Create a Transport to use for the default Authenticator exported from @dfinity/authentication as `authenticator`
 */
export function DefaultAuthenticatorTransport(): Transport<AuthenticatorEnvelope> {
  return BrowserTransport({
    identityProvider: RedirectTransport(location),
  });
}
