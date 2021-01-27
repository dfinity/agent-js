import { blobToHex } from '@dfinity/agent';
import { stringifyScope, Scope } from '../idp-protocol/scope';
import { Ed25519KeyIdentity } from '../identity/ed25519';
import { AuthenticationRequest } from '../idp-protocol/request';
import { isMaybeAuthenticationResponseUrl } from '../idp-protocol/response';
import { IdentityProviderAgentEnvelope, IdentityProviderIndicator, Transport } from './transport';

interface IIdentityProviderAgent {
  sendAuthenticationRequest(command: SendAuthenticationRequestCommand): Promise<void>;
  receiveAuthenticationResponse(url: URL): Promise<void>;
}

type SendAuthenticationRequestCommand = {
  redirectUri?: URL;
  scope: Scope;
};

export class IdentityProviderAgent implements IIdentityProviderAgent {
  #identityProvider: IdentityProviderIndicator;
  #transport: Transport<IdentityProviderAgentEnvelope>;
  constructor(spec: {
    identityProvider: IdentityProviderIndicator;
    transport: Transport<IdentityProviderAgentEnvelope>;
  }) {
    this.#identityProvider = spec.identityProvider;
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

  async receiveAuthenticationResponse(url: URL) {
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
