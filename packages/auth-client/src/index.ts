/** @module AuthClient */
import {
  AnonymousIdentity,
  DerEncodedPublicKey,
  Identity,
  Signature,
  SignIdentity,
} from '@dfinity/agent';
import { isDelegationValid } from '@dfinity/authentication';
import {
  Delegation,
  DelegationChain,
  DelegationIdentity,
  Ed25519KeyIdentity,
} from '@dfinity/identity';
import { Principal } from '@dfinity/principal';
import IdleManager, { IdleManagerOptions } from './idleManager';

const KEY_LOCALSTORAGE_KEY = 'identity';
const KEY_LOCALSTORAGE_DELEGATION = 'delegation';
const IDENTITY_PROVIDER_DEFAULT = 'https://identity.ic0.app';
const IDENTITY_PROVIDER_ENDPOINT = '#authorize';

const INTERRUPT_CHECK_INTERVAL = 500;

export const ERROR_USER_INTERRUPT = 'UserInterrupt';

/**
 * List of options for creating an {@link AuthClient}.
 */
export interface AuthClientCreateOptions {
  /**
   * An identity to use as the base
   */
  identity?: SignIdentity;
  /**
   * Optional storage with get, set, and remove. Uses LocalStorage by default
   */
  storage?: AuthClientStorage;
  /**
   * Options to handle idle timeouts
   * @default after 30 minutes, invalidates the identity
   */
  idleOptions?: IdleOptions;
}

export interface IdleOptions extends IdleManagerOptions {
  /**
   * Disables idle functionality for {@link IdleManager}
   * @default false
   */
  disableIdle?: boolean;
}

export * from './idleManager';

export interface AuthClientLoginOptions {
  /**
   * Identity provider
   * @default "https://identity.ic0.app"
   */
  identityProvider?: string | URL;
  /**
   * Expiration of the authentication in nanoseconds
   * @default  BigInt(8) hours * BigInt(3_600_000_000_000) nanoseconds
   */
  maxTimeToLive?: bigint;
  /**
   * Auth Window feature config string
   * @example "toolbar=0,location=0,menubar=0,width=500,height=500,left=100,top=100"
   */
  windowOpenerFeatures?: string;
  /**
   * Callback once login has completed
   */
  onSuccess?: (() => void) | (() => Promise<void>);
  /**
   * Callback in case authentication fails
   */
  onError?: ((error?: string) => void) | ((error?: string) => Promise<void>);
}

/**
 * Interface for persisting user authentication data
 */
export interface AuthClientStorage {
  get(key: string): Promise<string | null>;

  set(key: string, value: string): Promise<void>;

  remove(key: string): Promise<void>;
}

interface InternetIdentityAuthRequest {
  kind: 'authorize-client';
  sessionPublicKey: Uint8Array;
  maxTimeToLive?: bigint;
}

interface InternetIdentityAuthResponseSuccess {
  kind: 'authorize-client-success';
  delegations: {
    delegation: {
      pubkey: Uint8Array;
      expiration: bigint;
      targets?: Principal[];
    };
    signature: Uint8Array;
  }[];
  userPublicKey: Uint8Array;
}

async function _deleteStorage(storage: AuthClientStorage) {
  await storage.remove(KEY_LOCALSTORAGE_KEY);
  await storage.remove(KEY_LOCALSTORAGE_DELEGATION);
}

export class LocalStorage implements AuthClientStorage {
  constructor(public readonly prefix = 'ic-', private readonly _localStorage?: Storage) {}

  public get(key: string): Promise<string | null> {
    return Promise.resolve(this._getLocalStorage().getItem(this.prefix + key));
  }

  public set(key: string, value: string): Promise<void> {
    this._getLocalStorage().setItem(this.prefix + key, value);
    return Promise.resolve();
  }

  public remove(key: string): Promise<void> {
    this._getLocalStorage().removeItem(this.prefix + key);
    return Promise.resolve();
  }

  private _getLocalStorage() {
    if (this._localStorage) {
      return this._localStorage;
    }

    const ls =
      typeof window === 'undefined'
        ? typeof global === 'undefined'
          ? typeof self === 'undefined'
            ? undefined
            : self.localStorage
          : global.localStorage
        : window.localStorage;

    if (!ls) {
      throw new Error('Could not find local storage.');
    }

    return ls;
  }
}

interface AuthReadyMessage {
  kind: 'authorize-ready';
}

interface AuthResponseSuccess {
  kind: 'authorize-client-success';
  delegations: {
    delegation: {
      pubkey: Uint8Array;
      expiration: bigint;
      targets?: Principal[];
    };
    signature: Uint8Array;
  }[];
  userPublicKey: Uint8Array;
}

interface AuthResponseFailure {
  kind: 'authorize-client-failure';
  text: string;
}

type IdentityServiceResponseMessage = AuthReadyMessage | AuthResponse;
type AuthResponse = AuthResponseSuccess | AuthResponseFailure;

/**
 * Tool to manage authentication and identity
 * @see {@link AuthClient}
 */
export class AuthClient {
  /**
   * Create an AuthClient to manage authentication and identity
   * @constructs {@link AuthClient}
   * @param {AuthClientCreateOptions} options
   * @see {@link AuthClientCreateOptions}
   * @param options.identity Optional Identity to use as the base
   * @see {@link SignIdentity}
   * @param options.storage Storage mechanism for delegration credentials
   * @see {@link AuthClientStorage}
   * @param {IdleOptions} options.idleOptions Configures an {@link IdleManager}
   * @see {@link IdleOptions}
   * @example
   * const authClient = await AuthClient.create({
   *   idleOptions: {
   *     disableIdle: true
   *   }
   * })
   */
  public static async create(
    options: {
      /**
       * An {@link Identity} to use as the base.
       *  By default, a new {@link AnonymousIdentity}
       */
      identity?: SignIdentity;
      /**
       * {@link AuthClientStorage}
       * @description Optional storage with get, set, and remove. Uses {@link LocalStorage} by default
       */
      storage?: AuthClientStorage;
      /**
       * Options to handle idle timeouts
       * @default after 10 minutes, invalidates the identity
       */
      idleOptions?: IdleOptions;
    } = {},
  ): Promise<AuthClient> {
    const storage = options.storage ?? new LocalStorage('ic-');

    let key: null | SignIdentity = null;
    if (options.identity) {
      key = options.identity;
    } else {
      const maybeIdentityStorage = await storage.get(KEY_LOCALSTORAGE_KEY);
      if (maybeIdentityStorage) {
        try {
          key = Ed25519KeyIdentity.fromJSON(maybeIdentityStorage);
        } catch (e) {
          // Ignore this, this means that the localStorage value isn't a valid Ed25519KeyIdentity
          // serialization.
        }
      }
    }

    let identity = new AnonymousIdentity();
    let chain: null | DelegationChain = null;

    if (key) {
      try {
        const chainStorage = await storage.get(KEY_LOCALSTORAGE_DELEGATION);

        if (options.identity) {
          identity = options.identity;
        } else if (chainStorage) {
          chain = DelegationChain.fromJSON(chainStorage);

          // Verify that the delegation isn't expired.
          if (!isDelegationValid(chain)) {
            await _deleteStorage(storage);
            key = null;
          } else {
            identity = DelegationIdentity.fromDelegation(key, chain);
          }
        }
      } catch (e) {
        console.error(e);
        // If there was a problem loading the chain, delete the key.
        await _deleteStorage(storage);
        key = null;
      }
    }

    const idleManager = options.idleOptions?.disableIdle
      ? undefined
      : IdleManager.create(options.idleOptions);

    return new this(identity, key, chain, storage, idleManager);
  }

  protected constructor(
    private _identity: Identity,
    private _key: SignIdentity | null,
    private _chain: DelegationChain | null,
    private _storage: AuthClientStorage,
    public readonly idleManager: IdleManager | undefined,
    // A handle on the IdP window.
    private _idpWindow?: Window,
    // The event handler for processing events from the IdP.
    private _eventHandler?: (event: MessageEvent) => void,
  ) {
    const logout = this.logout.bind(this);
    this.idleManager?.registerCallback(logout);
  }

  private _handleSuccess(message: InternetIdentityAuthResponseSuccess, onSuccess?: () => void) {
    const delegations = message.delegations.map(signedDelegation => {
      return {
        delegation: new Delegation(
          signedDelegation.delegation.pubkey,
          signedDelegation.delegation.expiration,
          signedDelegation.delegation.targets,
        ),
        signature: signedDelegation.signature.buffer as Signature,
      };
    });

    const delegationChain = DelegationChain.fromDelegations(
      delegations,
      message.userPublicKey.buffer as DerEncodedPublicKey,
    );

    const key = this._key;
    if (!key) {
      return;
    }

    this._chain = delegationChain;
    this._identity = DelegationIdentity.fromDelegation(key, this._chain);

    this._idpWindow?.close();
    onSuccess?.();
    this._removeEventListener();
    delete this._idpWindow;
  }

  public getIdentity(): Identity {
    return this._identity;
  }

  public async isAuthenticated(): Promise<boolean> {
    return !this.getIdentity().getPrincipal().isAnonymous() && this._chain !== null;
  }

  /**
   * AuthClient Login -
   * Opens up a new window to authenticate with Internet Identity
   * @param {AuthClientLoginOptions} options
   * @param options.identityProvider Identity provider
   * @param options.maxTimeToLive Expiration of the authentication in nanoseconds
   * @param options.windowOpenerFeatures Configures the opened authentication window
   * @param options.onSuccess Callback once login has completed
   * @param options.onError Callback in case authentication fails
   * @example
   * const authClient = await AuthClient.create();
   * authClient.login({
   *  identityProvider: 'http://<canisterID>.localhost:8000',
   *  maxTimeToLive: BigInt (7) * BigInt(24) * BigInt(3_600_000_000_000), // 1 week
   *  windowOpenerFeatures: "toolbar=0,location=0,menubar=0,width=500,height=500,left=100,top=100",
   *  onSuccess: () => {
   *    console.log('Login Successful!');
   *  },
   *  onError: (error) => {
   *    console.error('Login Failed: ', error);
   *  }
   * });
   */
  public async login(options?: {
    /**
     * Identity provider
     * @default "https://identity.ic0.app"
     */
    identityProvider?: string | URL;
    /**
     * Expiration of the authentication in nanoseconds
     * @default  BigInt(8) hours * BigInt(3_600_000_000_000) nanoseconds
     */
    maxTimeToLive?: bigint;
    /**
     * Auth Window feature config string
     * @example "toolbar=0,location=0,menubar=0,width=500,height=500,left=100,top=100"
     */
    windowOpenerFeatures?: string;
    /**
     * Callback once login has completed
     */
    onSuccess?: (() => void) | (() => Promise<void>);
    /**
     * Callback in case authentication fails
     */
    onError?: ((error?: string) => void) | ((error?: string) => Promise<void>);
  }): Promise<void> {
    let key = this._key;
    if (!key) {
      // Create a new key (whether or not one was in storage).
      key = Ed25519KeyIdentity.generate();
      this._key = key;
      await this._storage.set(KEY_LOCALSTORAGE_KEY, JSON.stringify(key));
    }

    // Set default maxTimeToLive to 8 hours
    const defaultTimeToLive = /* hours */ BigInt(8) * /* nanoseconds */ BigInt(3_600_000_000_000);

    // Create the URL of the IDP. (e.g. https://XXXX/#authorize)
    const identityProviderUrl = new URL(
      options?.identityProvider?.toString() || IDENTITY_PROVIDER_DEFAULT,
    );
    // Set the correct hash if it isn't already set.
    identityProviderUrl.hash = IDENTITY_PROVIDER_ENDPOINT;

    // If `login` has been called previously, then close/remove any previous windows
    // and event listeners.
    this._idpWindow?.close();
    this._removeEventListener();

    // Add an event listener to handle responses.
    this._eventHandler = this._getEventHandler(identityProviderUrl, {
      maxTimeToLive: options?.maxTimeToLive ?? defaultTimeToLive,
      ...options,
    });
    window.addEventListener('message', this._eventHandler);

    // Open a new window with the IDP provider.
    this._idpWindow =
      window.open(identityProviderUrl.toString(), 'idpWindow', options?.windowOpenerFeatures) ??
      undefined;

    // Check if the _idpWindow is closed by user.
    const checkInterruption = (): void => {
      // The _idpWindow is opened and not yet closed by the client
      if (this._idpWindow) {
        if (this._idpWindow.closed) {
          this._handleFailure(ERROR_USER_INTERRUPT, options?.onError);
        } else {
          setTimeout(checkInterruption, INTERRUPT_CHECK_INTERVAL);
        }
      }
    };
    checkInterruption();
  }

  private _getEventHandler(identityProviderUrl: URL, options?: AuthClientLoginOptions) {
    return async (event: MessageEvent) => {
      if (event.origin !== identityProviderUrl.origin) {
        console.warn(
          `WARNING: expected origin '${identityProviderUrl.origin}', got '${event.origin}' (ignoring)`,
        );
        return;
      }

      const message = event.data as IdentityServiceResponseMessage;

      switch (message.kind) {
        case 'authorize-ready': {
          // IDP is ready. Send a message to request authorization.
          const request: InternetIdentityAuthRequest = {
            kind: 'authorize-client',
            sessionPublicKey: new Uint8Array(this._key?.getPublicKey().toDer() as ArrayBuffer),
            maxTimeToLive: options?.maxTimeToLive,
          };
          this._idpWindow?.postMessage(request, identityProviderUrl.origin);
          break;
        }
        case 'authorize-client-success':
          // Create the delegation chain and store it.
          try {
            this._handleSuccess(message, options?.onSuccess);

            // Setting the storage is moved out of _handleSuccess to make
            // it a sync function. Having _handleSuccess as an async function
            // messes up the jest tests for some reason.
            if (this._chain) {
              await this._storage.set(
                KEY_LOCALSTORAGE_DELEGATION,
                JSON.stringify(this._chain.toJSON()),
              );
            }
          } catch (err) {
            this._handleFailure((err as Error).message, options?.onError);
          }
          break;
        case 'authorize-client-failure':
          this._handleFailure(message.text, options?.onError);
          break;
        default:
          break;
      }
    };
  }

  private _handleFailure(errorMessage?: string, onError?: (error?: string) => void): void {
    this._idpWindow?.close();
    onError?.(errorMessage);
    this._removeEventListener();
    delete this._idpWindow;
  }

  private _removeEventListener() {
    if (this._eventHandler) {
      window.removeEventListener('message', this._eventHandler);
    }
    this._eventHandler = undefined;
  }

  public async logout(options: { returnTo?: string } = {}): Promise<void> {
    _deleteStorage(this._storage);

    // Reset this auth client to a non-authenticated state.
    this._identity = new AnonymousIdentity();
    this._key = null;
    this._chain = null;

    if (options.returnTo) {
      try {
        window.history.pushState({}, '', options.returnTo);
      } catch (e) {
        window.location.href = options.returnTo;
      }
    }
  }
}
