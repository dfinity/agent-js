import {
  Transport,
  BrowserTransport,
  DomEventTransport,
  RedirectTransport,
  IdentityProviderIndicator,
} from '../idp-agent/transport';
import { AuthenticationResponseUrlDetectedEvent } from '../id-dom-events';
import {
  BootstrapChangeIdentityCommand,
  BootstrapChangeIdentityCommandIdentifier,
} from '../bootstrap-messages/BootstrapChangeIdentityCommand';
import { IdentityProviderAgent, SendAuthenticationRequestCommand } from '../idp-agent/idp-agent';
import { unsafeTemporaryIdentityProvider } from '../idp-agent';
import { makeLog } from '@dfinity/agent';

type ReceiveAuthenticationResponseCommand = {
  url: URL;
  sign: (challenge: ArrayBuffer) => Promise<ArrayBuffer>;
};

type UseSessionCommand = {
  /**
   * ic-id-protocol AuthenticationResponse as a URL string.
   * This is the result of an oauth2 flow initiated by sendAuthenticationRequest.
   * If this is undefined, a whole authentication can't really complete,
   * but it can be useful for ic-id relying parties to model a
   * Session and it's keyPair in order to create an AuthenticationRequest,
   * and only later the authenticationResponse is updated (if received).
   */
  authenticationResponse?: string;
  identity: {
    sign(challenge: ArrayBuffer): Promise<ArrayBuffer>;
  };
};

export interface IAuthenticator {
  sendAuthenticationRequest: IdentityProviderAgent['sendAuthenticationRequest'];
  /**
   * Complete Authentication by receiving an AuthenticationResponse encoded in the provided URL (if present).
   * @param command - parameters used for processing the AuthenticationResponse.
   */
  receiveAuthenticationResponse(
    command: ReceiveAuthenticationResponseCommand,
  ): void | Promise<void>;
  useSession(command: UseSessionCommand): void | Promise<void>;
}

export type AuthenticatorEnvelope =
  | { to: 'document'; message: ReturnType<typeof AuthenticationResponseUrlDetectedEvent> }
  | { to: 'document'; message: BootstrapChangeIdentityCommand };

interface AuthenticatorOptions {
  transport: Transport<AuthenticatorEnvelope>;
  identityProvider: IdentityProviderIndicator;
}

export class Authenticator implements IAuthenticator {
  #identityProviderAgent: IdentityProviderAgent;
  #log = makeLog('Authenticator');
  #transport: Transport<AuthenticatorEnvelope>;
  constructor(
    options: AuthenticatorOptions = {
      transport: DefaultAuthenticatorTransport(document),
      identityProvider: unsafeTemporaryIdentityProvider,
    },
  ) {
    this.#transport = options.transport;
    this.#identityProviderAgent = new IdentityProviderAgent({
      transport: this.#transport,
      identityProvider: options.identityProvider,
      location: location,
    });
  }
  async receiveAuthenticationResponse(
    command: ReceiveAuthenticationResponseCommand,
  ): Promise<void> {
    this.#transport.send({
      to: 'document',
      message: AuthenticationResponseUrlDetectedEvent(command),
    });
  }
  async sendAuthenticationRequest(command: SendAuthenticationRequestCommand): Promise<void> {
    return this.#identityProviderAgent.sendAuthenticationRequest(command);
  }
  async useSession(command: UseSessionCommand): Promise<void> {
    if (!command.authenticationResponse) {
      this.#log(
        'debug',
        'useSession called without authenticationResponse. Will NOT send BootstrapChangeIdentityCommand.',
      );
      return;
    }
    const message: BootstrapChangeIdentityCommand = {
      type: BootstrapChangeIdentityCommandIdentifier,
      detail: {
        ...command,
        authenticationResponse: command.authenticationResponse,
      },
    };
    const envelope = {
      to: 'document' as const,
      message,
    };
    this.#log('debug', 'useSession sending to document', envelope);
    await this.#transport.send(envelope);
  }
}

/**
 * Create a Transport to use for the default Authenticator exported from @dfinity/authentication as `authenticator`
 * @param eventTarget - dispatch events on this
 */
export function DefaultAuthenticatorTransport(eventTarget: Pick<EventTarget,'dispatchEvent'>): Transport<AuthenticatorEnvelope> {
  return BrowserTransport({
    document: DomEventTransport(eventTarget),
    identityProvider: RedirectTransport(location),
  });
}
