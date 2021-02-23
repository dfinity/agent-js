import {
  Transport,
  BrowserTransport,
  DomEventTransport,
  RedirectTransport,
  IdentityProviderIndicator,
} from '../idp-agent/transport';
import { IdentityChangedEventIdentifier, IdentityChangedEvent } from '../id-dom-events';
import {
  BootstrapChangeIdentityCommand,
  BootstrapChangeIdentityCommandIdentifier,
} from '../bootstrap-messages/BootstrapChangeIdentityCommand';
import { IdentityProviderAgent, SendAuthenticationRequestCommand } from '../idp-agent/idp-agent';
import { unsafeTemporaryIdentityProvider } from '../idp-agent';
import { isIdentityDescriptor } from '@dfinity/agent';

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
export type AuthenticatorEventTarget = {
  addEventListener(type: typeof IdentityChangedEventIdentifier, listener: (event: IdentityChangedEvent) => void): void;
  removeEventListener(type: typeof IdentityChangedEventIdentifier, listener: (event: IdentityChangedEvent) => void): void;
}

export interface IAuthenticator extends AuthenticatorEventTarget {
  sendAuthenticationRequest: IdentityProviderAgent['sendAuthenticationRequest'];
  useSession(command: UseSessionCommand): void | Promise<void>;
}

export type AuthenticatorEnvelope =
  | { to: 'document'; message: BootstrapChangeIdentityCommand };

interface AuthenticatorOptions {
  transport?: Transport<AuthenticatorEnvelope>;
  identityProvider?: IdentityProviderIndicator;
  events?: EventTarget;
}

type IdentityChangedEventListener = (id: IdentityChangedEvent) => void;
type AuthenticatorListener = IdentityChangedEventListener;

export class Authenticator implements IAuthenticator {
  #identityProviderAgent: IdentityProviderAgent;
  #transport: Transport<AuthenticatorEnvelope>;
  #events: EventTarget = document;
  #listenerToDomListener: WeakMap<IdentityChangedEventListener, EventListener> = new WeakMap

  constructor(options: AuthenticatorOptions = {}) {
    this.#events = options.events ?? document;
    this.#transport = options.transport ?? DefaultAuthenticatorTransport(document);
    this.#identityProviderAgent = new IdentityProviderAgent({
      transport: this.#transport,
      identityProvider: options.identityProvider ?? unsafeTemporaryIdentityProvider,
      location: location,
    });
  }
  /**
   * noop for now, stubbed with @todo to implement.
   * Identical to https://developer.mozilla.org/en-US/docs/Web/API/EventTarget.
   * Eventually will be a subset of it to be node-friendly away from DOM.
   * @param type - type of event to listen for
   * @param listener - listener called for each event
   */
  addEventListener(type: typeof IdentityChangedEventIdentifier, listener: IdentityChangedEventListener): void {
    const domEventListener: EventListener = this.#listenerToDomListener.get(listener) || this.createDomEventListener(listener);
    this.#listenerToDomListener.set(listener, domEventListener)
    this.#events.addEventListener(IdentityChangedEventIdentifier, domEventListener);
  }
  /**
   * Remoe a previously-added (or not) event listener.
   * @param type - event type for which to stop calling the listener
   * @param listener - listener to remove
   */
  removeEventListener: AuthenticatorEventTarget['removeEventListener'] = (
    type,
    listener,
  ) => {
    const domEventListener = this.#listenerToDomListener.get(listener);
    if ( ! domEventListener) {
      return;
    }
    this.#events.removeEventListener(IdentityChangedEventIdentifier, domEventListener);
    this.#listenerToDomListener.delete(listener);
  };
  private createDomEventListener(listener: AuthenticatorListener): EventListener {
    const domEventListener: EventListener = (event: Event|CustomEvent) => {
      const detail = ('detail' in event) && event.detail;
      const identity: unknown = detail && ('identity' in detail) && detail?.identity;
      if ( ! isIdentityDescriptor(identity)) {
        return;
      }
      listener({
        type: IdentityChangedEventIdentifier,
        detail: {identity},
      });
    }
    return domEventListener;
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
  /**
   * Publish a BootstrapChangeIdentityCommand with info from a UseSessionCommand
   * @param command - used to build BootstrapChangeIdentityCommand
   * @param command.authenticationResponse - ic-id-protocol.AuthenticationResponse as a url string
   * @param command.identity - ic-id-rp (canister) controlled keypair that is delegated to
   *    for the extend of a certain expiry and scope
   */
  public async useSession(command: UseSessionCommand): Promise<void> {
    if (!command.authenticationResponse) {
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
