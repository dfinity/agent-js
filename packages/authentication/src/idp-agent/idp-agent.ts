import { makeLog } from '@dfinity/agent';
import { stringifyScope, Scope } from '../idp-protocol/scope';
import { AuthenticationRequest } from '../idp-protocol/request';
import { IdentityProviderAgentEnvelope, IdentityProviderIndicator, Transport } from './transport';
import { hexEncodeUintArray } from '../idp-protocol/bytes';

/**
 * Object that knows how to interact with an ic-id Identity Provider by sending/receiving messages.
 */
export interface IdentityProviderAgent {
  /**
   * Initiate Authentication by sending an AuthenticationRequest to the Identity Provider.
   * @param command - parameters to build the AuthenticationRequest
   */
  sendAuthenticationRequest(command: SendAuthenticationRequestCommand): Promise<void>;
}

export type SendAuthenticationRequestCommand = {
  session: {
    identity: {
      publicKey: {
        toDer(): Uint8Array
      }
    }
  }
  redirectUri?: URL;
  scope: Scope;
};

export class IdentityProviderAgent implements IdentityProviderAgent {
  #identityProvider: IdentityProviderIndicator;
  #transport: Transport<IdentityProviderAgentEnvelope>;
  #location: Pick<Location, 'href'>;
  #log = makeLog('IdentityProviderAgent')
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
      : this.#location.toString();
    const authenticationRequest: AuthenticationRequest = {
      type: 'AuthenticationRequest',
      redirectUri,
      scope: stringifyScope(spec.scope),
      sessionIdentity: {
        hex: hexEncodeUintArray(spec.session.identity.publicKey.toDer()),
      },
    };
    await this.#transport.send({
      to: this.#identityProvider,
      message: authenticationRequest,
    });
  }
}
