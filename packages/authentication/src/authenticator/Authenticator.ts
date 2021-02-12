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

/** Eventually don't depend on tsc lib dom for this */
export type AuthenticatorEventTarget = Pick<
  EventTarget,
  'addEventListener' | 'removeEventListener'
>;

export interface IAuthenticator extends AuthenticatorEventTarget {
  sendAuthenticationRequest: IdentityProviderAgent['sendAuthenticationRequest'];
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
  /**
   * noop for now, stubbed with @todo to implement.
   * Identical to https://developer.mozilla.org/en-US/docs/Web/API/EventTarget.
   * Eventually will be a subset of it to be node-friendly away from DOM.
   * @param type - event type to add a listener for.
   * @param listener - called on each event
   */
  public addEventListener: AuthenticatorEventTarget['addEventListener'] = (type, listener) => {
    this.#log('debug', 'addEventListener', { type, listener });
  };
  /**
   * Remoe a previously-added (or not) event listener.
   * @param type - event type for which to stop calling the listener
   * @param listener - listener to remove
   * @param options - listening options
   */
  public removeEventListener: AuthenticatorEventTarget['removeEventListener'] = (
    type,
    listener,
    options,
  ) => {
    this.#log('debug', 'removeEventListener', { type, listener, options });
  };
  /**
   * Send an ic-id-protocol.AuthenticationRequest to an Identity Provider (IDP).
   * Usually this happens by serializing the request as a query string and redirecting to the
   * identityProvider url with the query string appended.
   * @param command SendAuthenticationRequestCommand
   */
  public async sendAuthenticationRequest(command: SendAuthenticationRequestCommand): Promise<void> {
    return this.#identityProviderAgent.sendAuthenticationRequest(command);
  }
  /**
   * Publish a BootstrapChangeIdentityCommand with info from a UseSessionCommand
   * @param command - used to build BootstrapChangeIdentityCommand
   * @param command.authenticationResponse - ic-id-protocol.AuthenticationResponse as a url string
   * @param command.identity - ic-id-rp (canister) controlled keypair that is delegated to
   *    for the extend of a certain expiry and scope
   */
  public async useSession(command: UseSessionCommand): Promise<void> {
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
export function DefaultAuthenticatorTransport(
  eventTarget: Pick<EventTarget, 'dispatchEvent'>,
): Transport<AuthenticatorEnvelope> {
  return BrowserTransport({
    document: DomEventTransport(eventTarget),
    identityProvider: RedirectTransport(location),
  });
}
