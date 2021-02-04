import { blobToHex } from '@dfinity/agent';
import { stringifyScope, Scope } from '../idp-protocol/scope';
import { Ed25519KeyIdentity } from '../identity/ed25519';
import { AuthenticationRequest } from '../idp-protocol/request';
import { isMaybeAuthenticationResponseUrl } from '../idp-protocol/response';
import { IdentityProviderAgentEnvelope, IdentityProviderIndicator, Transport } from './transport';

/**
 * Object that knows how to interact with an ic-id Identity Provider by sending/receiving messages.
 */
export interface IdentityProviderAgent {
  /**
   * Initiate Authentication by sending an AuthenticationRequest to the Identity Provider.
   * @param command - parameters to build the AuthenticationRequest
   */
  sendAuthenticationRequest(command: SendAuthenticationRequestCommand): Promise<void>;
  /**
   * Complete Authentication by receiving an AuthenticationResponse encoded in the provided URL (if present).
   * @param url - URL containing AuthenticationResponse as query string parameters
   *   (i.e. an oauth2 redirect_uri + accessTokenResponse)
   */
  receiveAuthenticationResponse(url: URL): Promise<void>;
}

type SendAuthenticationRequestCommand = {
  redirectUri?: URL;
  scope: Scope;
};

export class IdentityProviderAgent implements IdentityProviderAgent {
  #identityProvider: IdentityProviderIndicator;
  #transport: Transport<IdentityProviderAgentEnvelope>;
  #location: Pick<Location, 'href'>;
  constructor(spec: {
    identityProvider: IdentityProviderIndicator;
    transport: Transport<IdentityProviderAgentEnvelope>;
    location: Pick<Location, 'href'>;
  }) {
    this.#identityProvider = spec.identityProvider;
    this.#location = spec.location;
    this.#transport = spec.transport;
  }
  async sendAuthenticationRequest(spec: SendAuthenticationRequestCommand): Promise<void> {
    const redirectUri: string = spec.redirectUri
      ? spec.redirectUri.toString()
      : globalThis.location.toString();
    const sessionIdentity = Ed25519KeyIdentity.generate();
    const authenticationRequest: AuthenticationRequest = {
      type: 'AuthenticationRequest',
      redirectUri,
      scope: stringifyScope(spec.scope),
      sessionIdentity: {
        hex: blobToHex(sessionIdentity.getPublicKey().toDer()),
      },
    };
    await this.#transport.send({
      to: this.#identityProvider,
      message: authenticationRequest,
    });
  }

  async receiveAuthenticationResponse(url:URL=new URL(this.#location.href)): Promise<void> {
    console.debug('idp-agent', 'receiveAuthenticationResponse', { url });
    if (!isMaybeAuthenticationResponseUrl(url)) {
      console.debug(
        'receiveAuthenticationResponse called, but the URL does not appear to contain an AuthenticationResponse',
      );
      return;
    }
    const authenticationResponseUrlDetectedEvent = {
      type: 'AuthenticationResponseUrlDetectedEvent' as const,
      payload: {
        url,
      },
    };
    this.#transport.send({
      to: 'document',
      message: authenticationResponseUrlDetectedEvent,
    });
  }
}
