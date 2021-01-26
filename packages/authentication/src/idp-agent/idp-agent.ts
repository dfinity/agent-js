import { blobToHex } from '@dfinity/agent';
import { stringifyScope, Scope } from '../idp-protocol/scope';
import { Ed25519KeyIdentity } from '../identity/ed25519';
import { AuthenticationRequest } from '../idp-protocol/request';

export interface IdentityProviderIndicator {
  url: URL;
}

interface IIdentityProviderAgent {
  sendAuthenticationRequest(command: SendAuthenticationRequestCommand): Promise<void>;
}

type Sendable = {
  to: IdentityProviderIndicator;
  message: AuthenticationRequest;
};

type Sender = (s: Sendable) => Promise<void>;

export type Transport = {
  send: Sender;
};

type SendAuthenticationRequestCommand = {
  redirectUri?: URL;
  scope: Scope;
};

export class IdentityProviderAgent implements IIdentityProviderAgent {
  #identityProvider: IdentityProviderIndicator;
  #transport: Transport = {
    async send(sendable) {
      console.log('IdentityProviderAgent default sender', sendable);
    },
  };
  constructor(spec: { identityProvider: IdentityProviderIndicator; transport: Transport }) {
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
}
