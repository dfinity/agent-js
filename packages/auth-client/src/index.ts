import {
  AnonymousIdentity,
  type DerEncodedPublicKey,
  type Identity,
  type Signature,
  SignIdentity,
} from '@dfinity/agent';
import {
  Delegation,
  DelegationChain,
  isDelegationValid,
  DelegationIdentity,
  Ed25519KeyIdentity,
  ECDSAKeyIdentity,
  PartialDelegationIdentity,
  PartialIdentity,
} from '@dfinity/identity';
import { Principal } from '@dfinity/principal';
import { IdleManager, type IdleManagerOptions } from './idleManager.ts';
import {
  type AuthClientStorage,
  IdbStorage,
  isBrowser,
  KEY_STORAGE_DELEGATION,
  KEY_STORAGE_KEY,
  KEY_VECTOR,
  LocalStorage,
} from './storage.ts';

export {
  type AuthClientStorage,
  IdbStorage,
  LocalStorage,
  KEY_STORAGE_DELEGATION,
  KEY_STORAGE_KEY,
} from './storage.ts';
export { IdbKeyVal, type DBCreateOptions } from './db.ts';

const NANOSECONDS_PER_SECOND = BigInt(1_000_000_000);
const SECONDS_PER_HOUR = BigInt(3_600);
const NANOSECONDS_PER_HOUR = NANOSECONDS_PER_SECOND * SECONDS_PER_HOUR;

const IDENTITY_PROVIDER_DEFAULT = 'https://identity.internetcomputer.org';
const IDENTITY_PROVIDER_ENDPOINT = '#authorize';

const DEFAULT_MAX_TIME_TO_LIVE = BigInt(8) * NANOSECONDS_PER_HOUR;

const ECDSA_KEY_LABEL = 'ECDSA';
const ED25519_KEY_LABEL = 'Ed25519';
type BaseKeyType = typeof ECDSA_KEY_LABEL | typeof ED25519_KEY_LABEL;

const INTERRUPT_CHECK_INTERVAL = 500;

export const ERROR_USER_INTERRUPT = 'UserInterrupt';

/**
 * List of options for creating an {@link AuthClient}.
 */
export interface AuthClientCreateOptions {
  /**
   * An {@link SignIdentity} or {@link PartialIdentity} to authenticate via delegation.
   */
  identity?: SignIdentity | PartialIdentity;
  /**
   * Optional storage with get, set, and remove. Uses {@link IdbStorage} by default.
   * @see {@link AuthClientStorage}
   */
  storage?: AuthClientStorage;

  /**
   * Type to use for the base key.
   *
   * If you are using a custom storage provider that does not support CryptoKey storage,
   * you should use `Ed25519` as the key type, as it can serialize to a string.
   * @default 'ECDSA'
   */
  keyType?: BaseKeyType;

  /**
   * Options to handle idle timeouts
   * @default after 10 minutes, invalidates the identity
   */
  idleOptions?: IdleOptions;

  /**
   * Options to handle login, passed to the login method
   */
  loginOptions?: AuthClientLoginOptions;
}

export interface IdleOptions extends IdleManagerOptions {
  /**
   * Disables idle functionality for {@link IdleManager}
   * @default false
   */
  disableIdle?: boolean;

  /**
   * Disables default idle behavior - call logout & reload window
   * @default false
   */
  disableDefaultIdleCallback?: boolean;
}

export * from './idleManager.ts';

export type OnSuccessFunc =
  | (() => void | Promise<void>)
  | ((message: InternetIdentityAuthResponseSuccess) => void | Promise<void>);

export type OnErrorFunc = (error?: string) => void | Promise<void>;

export interface AuthClientLoginOptions {
  /**
   * Identity provider
   * @default "https://identity.internetcomputer.org"
   */
  identityProvider?: string | URL;
  /**
   * Expiration of the authentication in nanoseconds
   * @default  BigInt(8) hours * BigInt(3_600_000_000_000) nanoseconds
   */
  maxTimeToLive?: bigint;
  /**
   * If present, indicates whether or not the Identity Provider should allow the user to authenticate and/or register using a temporary key/PIN identity. Authenticating dapps may want to prevent users from using Temporary keys/PIN identities because Temporary keys/PIN identities are less secure than Passkeys (webauthn credentials) and because Temporary keys/PIN identities generally only live in a browser database (which may get cleared by the browser/OS).
   */
  allowPinAuthentication?: boolean;
  /**
   * Origin for Identity Provider to use while generating the delegated identity. For II, the derivation origin must authorize this origin by setting a record at `<derivation-origin>/.well-known/ii-alternative-origins`.
   * @see https://github.com/dfinity/internet-identity/blob/main/docs/internet-identity-spec.adoc
   */
  derivationOrigin?: string | URL;
  /**
   * Auth Window feature config string
   * @example "toolbar=0,location=0,menubar=0,width=500,height=500,left=100,top=100"
   */
  windowOpenerFeatures?: string;
  /**
   * Callback once login has completed
   */
  onSuccess?: OnSuccessFunc;
  /**
   * Callback in case authentication fails
   */
  onError?: OnErrorFunc;
  /**
   * Extra values to be passed in the login request during the authorize-ready phase
   */
  customValues?: Record<string, unknown>;
}

interface InternetIdentityAuthRequest {
  kind: 'authorize-client';
  sessionPublicKey: Uint8Array;
  maxTimeToLive?: bigint;
  allowPinAuthentication?: boolean;
  derivationOrigin?: string;
}

export interface InternetIdentityAuthResponseSuccess {
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
  authnMethod: 'passkey' | 'pin' | 'recovery';
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
  authnMethod: 'passkey' | 'pin' | 'recovery';
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
   * @param {AuthClientCreateOptions} options - Options for creating an {@link AuthClient}
   * @see {@link AuthClientCreateOptions}
   * @param options.identity Optional Identity to use as the base
   * @see {@link SignIdentity}
   * @param options.storage Storage mechanism for delegation credentials
   * @see {@link AuthClientStorage}
   * @param options.keyType Type of key to use for the base key
   * @param {IdleOptions} options.idleOptions Configures an {@link IdleManager}
   * @see {@link IdleOptions}
   * Default behavior is to clear stored identity and reload the page when a user goes idle, unless you set the disableDefaultIdleCallback flag or pass in a custom idle callback.
   * @example
   * const authClient = await AuthClient.create({
   *   idleOptions: {
   *     disableIdle: true
   *   }
   * })
   */
  public static async create(options: AuthClientCreateOptions = {}): Promise<AuthClient> {
    const storage = options.storage ?? new IdbStorage();
    const keyType = options.keyType ?? ECDSA_KEY_LABEL;

    let key: null | SignIdentity | PartialIdentity = null;
    if (options.identity) {
      key = options.identity;
    } else {
      let maybeIdentityStorage = await storage.get(KEY_STORAGE_KEY);
      if (!maybeIdentityStorage && isBrowser) {
        // Attempt to migrate from localstorage
        try {
          const fallbackLocalStorage = new LocalStorage();
          const localChain = await fallbackLocalStorage.get(KEY_STORAGE_DELEGATION);
          const localKey = await fallbackLocalStorage.get(KEY_STORAGE_KEY);
          // not relevant for Ed25519
          if (localChain && localKey && keyType === ECDSA_KEY_LABEL) {
            console.log('Discovered an identity stored in localstorage. Migrating to IndexedDB');
            await storage.set(KEY_STORAGE_DELEGATION, localChain);
            await storage.set(KEY_STORAGE_KEY, localKey);

            maybeIdentityStorage = localChain;
            // clean up
            await fallbackLocalStorage.remove(KEY_STORAGE_DELEGATION);
            await fallbackLocalStorage.remove(KEY_STORAGE_KEY);
          }
        } catch (error) {
          console.error('error while attempting to recover localstorage: ' + error);
        }
      }
      if (maybeIdentityStorage) {
        try {
          if (typeof maybeIdentityStorage === 'object') {
            if (keyType === ED25519_KEY_LABEL && typeof maybeIdentityStorage === 'string') {
              key = Ed25519KeyIdentity.fromJSON(maybeIdentityStorage);
            } else {
              key = await ECDSAKeyIdentity.fromKeyPair(maybeIdentityStorage);
            }
          } else if (typeof maybeIdentityStorage === 'string') {
            // This is a legacy identity, which is a serialized Ed25519KeyIdentity.
            key = Ed25519KeyIdentity.fromJSON(maybeIdentityStorage);
          }
        } catch {
          // Ignore this, this means that the localStorage value isn't a valid Ed25519KeyIdentity or ECDSAKeyIdentity
          // serialization.
        }
      }
    }

    let identity: SignIdentity | PartialIdentity = new AnonymousIdentity() as PartialIdentity;
    let chain: null | DelegationChain = null;
    if (key) {
      try {
        const chainStorage = await storage.get(KEY_STORAGE_DELEGATION);
        if (typeof chainStorage === 'object' && chainStorage !== null) {
          throw new Error(
            'Delegation chain is incorrectly stored. A delegation chain should be stored as a string.',
          );
        }

        if (options.identity) {
          identity = options.identity;
        } else if (chainStorage) {
          chain = DelegationChain.fromJSON(chainStorage);

          // Verify that the delegation isn't expired.
          if (!isDelegationValid(chain)) {
            await _deleteStorage(storage);
            key = null;
          } else {
            // If the key is a public key, then we create a PartialDelegationIdentity.
            if ('toDer' in key) {
              identity = PartialDelegationIdentity.fromDelegation(key, chain);
              // otherwise, we create a DelegationIdentity.
            } else {
              identity = DelegationIdentity.fromDelegation(key, chain);
            }
          }
        }
      } catch (e) {
        console.error(e);
        // If there was a problem loading the chain, delete the key.
        await _deleteStorage(storage);
        key = null;
      }
    }
    let idleManager: IdleManager | undefined;
    if (options.idleOptions?.disableIdle) {
      idleManager = undefined;
    }
    // if there is a delegation chain or provided identity, setup idleManager
    else if (chain || options.identity) {
      idleManager = IdleManager.create(options.idleOptions);
    }

    if (!key) {
      // Create a new key (whether or not one was in storage).
      if (keyType === ED25519_KEY_LABEL) {
        key = Ed25519KeyIdentity.generate();
        await storage.set(KEY_STORAGE_KEY, JSON.stringify((key as Ed25519KeyIdentity).toJSON()));
      } else {
        if (options.storage && keyType === ECDSA_KEY_LABEL) {
          console.warn(
            `You are using a custom storage provider that may not support CryptoKey storage. If you are using a custom storage provider that does not support CryptoKey storage, you should use '${ED25519_KEY_LABEL}' as the key type, as it can serialize to a string`,
          );
        }
        key = await ECDSAKeyIdentity.generate();
        await storage.set(KEY_STORAGE_KEY, (key as ECDSAKeyIdentity).getKeyPair());
      }
    }

    return new this(identity, key, chain, storage, idleManager, options);
  }

  protected constructor(
    private _identity: Identity | PartialIdentity,
    private _key: SignIdentity | PartialIdentity,
    private _chain: DelegationChain | null,
    private _storage: AuthClientStorage,
    public idleManager: IdleManager | undefined,
    private _createOptions: AuthClientCreateOptions | undefined,
    // A handle on the IdP window.
    private _idpWindow?: Window,
    // The event handler for processing events from the IdP.
    private _eventHandler?: (event: MessageEvent) => void,
  ) {
    this._registerDefaultIdleCallback();
  }

  private _registerDefaultIdleCallback() {
    const idleOptions = this._createOptions?.idleOptions;
    /**
     * Default behavior is to clear stored identity and reload the page.
     * By either setting the disableDefaultIdleCallback flag or passing in a custom idle callback, we will ignore this config
     */
    if (!idleOptions?.onIdle && !idleOptions?.disableDefaultIdleCallback) {
      this.idleManager?.registerCallback(() => {
        this.logout();
        location.reload();
      });
    }
  }

  private async _handleSuccess(
    message: InternetIdentityAuthResponseSuccess,
    onSuccess?: OnSuccessFunc,
  ) {
    const delegations = message.delegations.map(signedDelegation => {
      return {
        delegation: new Delegation(
          signedDelegation.delegation.pubkey,
          signedDelegation.delegation.expiration,
          signedDelegation.delegation.targets,
        ),
        signature: signedDelegation.signature as Signature,
      };
    });

    const delegationChain = DelegationChain.fromDelegations(
      delegations,
      message.userPublicKey as DerEncodedPublicKey,
    );

    const key = this._key;
    if (!key) {
      return;
    }

    this._chain = delegationChain;

    if ('toDer' in key) {
      this._identity = PartialDelegationIdentity.fromDelegation(key, this._chain);
    } else {
      this._identity = DelegationIdentity.fromDelegation(key, this._chain);
    }

    this._idpWindow?.close();
    const idleOptions = this._createOptions?.idleOptions;
    // create the idle manager on a successful login if we haven't disabled it
    // and it doesn't already exist.
    if (!this.idleManager && !idleOptions?.disableIdle) {
      this.idleManager = IdleManager.create(idleOptions);
      this._registerDefaultIdleCallback();
    }

    this._removeEventListener();
    delete this._idpWindow;

    if (this._chain) {
      await this._storage.set(KEY_STORAGE_DELEGATION, JSON.stringify(this._chain.toJSON()));
    }

    // onSuccess should be the last thing to do to avoid consumers
    // interfering by navigating or refreshing the page
    onSuccess?.(message);
  }

  public getIdentity(): Identity {
    return this._identity;
  }

  public async isAuthenticated(): Promise<boolean> {
    return (
      !this.getIdentity().getPrincipal().isAnonymous() &&
      this._chain !== null &&
      isDelegationValid(this._chain)
    );
  }

  /**
   * AuthClient Login - Opens up a new window to authenticate with Internet Identity
   * @param {AuthClientLoginOptions} options - Options for logging in, merged with the options set during creation if any. Note: we only perform a shallow merge for the `customValues` property.
   * @param options.identityProvider Identity provider
   * @param options.maxTimeToLive Expiration of the authentication in nanoseconds
   * @param options.allowPinAuthentication If present, indicates whether or not the Identity Provider should allow the user to authenticate and/or register using a temporary key/PIN identity. Authenticating dapps may want to prevent users from using Temporary keys/PIN identities because Temporary keys/PIN identities are less secure than Passkeys (webauthn credentials) and because Temporary keys/PIN identities generally only live in a browser database (which may get cleared by the browser/OS).
   * @param options.derivationOrigin Origin for Identity Provider to use while generating the delegated identity
   * @param options.windowOpenerFeatures Configures the opened authentication window
   * @param options.onSuccess Callback once login has completed
   * @param options.onError Callback in case authentication fails
   * @param options.customValues Extra values to be passed in the login request during the authorize-ready phase. Note: we only perform a shallow merge for the `customValues` property.
   * @example
   * const authClient = await AuthClient.create();
   * authClient.login({
   *  identityProvider: 'http://<canisterID>.127.0.0.1:8000',
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
  public async login(options?: AuthClientLoginOptions): Promise<void> {
    // Merge the passed options with the options set during creation
    const loginOptions = mergeLoginOptions(this._createOptions?.loginOptions, options);

    // Set default maxTimeToLive to 8 hours
    const maxTimeToLive = loginOptions?.maxTimeToLive ?? DEFAULT_MAX_TIME_TO_LIVE;

    // Create the URL of the IDP. (e.g. https://XXXX/#authorize)
    const identityProviderUrl = new URL(
      loginOptions?.identityProvider?.toString() || IDENTITY_PROVIDER_DEFAULT,
    );
    // Set the correct hash if it isn't already set.
    identityProviderUrl.hash = IDENTITY_PROVIDER_ENDPOINT;

    // If `login` has been called previously, then close/remove any previous windows
    // and event listeners.
    this._idpWindow?.close();
    this._removeEventListener();

    // Add an event listener to handle responses.
    this._eventHandler = this._getEventHandler(identityProviderUrl, {
      maxTimeToLive,
      ...loginOptions,
    });
    window.addEventListener('message', this._eventHandler);

    // Open a new window with the IDP provider.
    this._idpWindow =
      window.open(
        identityProviderUrl.toString(),
        'idpWindow',
        loginOptions?.windowOpenerFeatures,
      ) ?? undefined;

    // Check if the _idpWindow is closed by user.
    const checkInterruption = (): void => {
      // The _idpWindow is opened and not yet closed by the client
      if (this._idpWindow) {
        if (this._idpWindow.closed) {
          this._handleFailure(ERROR_USER_INTERRUPT, loginOptions?.onError);
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
        // Ignore any event that is not from the identity provider
        return;
      }

      const message = event.data as IdentityServiceResponseMessage;

      switch (message.kind) {
        case 'authorize-ready': {
          // IDP is ready. Send a message to request authorization.
          const request: InternetIdentityAuthRequest = {
            kind: 'authorize-client',
            sessionPublicKey: new Uint8Array(this._key?.getPublicKey().toDer()),
            maxTimeToLive: options?.maxTimeToLive,
            allowPinAuthentication: options?.allowPinAuthentication,
            derivationOrigin: options?.derivationOrigin?.toString(),
            // Pass any custom values to the IDP.
            ...options?.customValues,
          };
          this._idpWindow?.postMessage(request, identityProviderUrl.origin);
          break;
        }
        case 'authorize-client-success':
          // Create the delegation chain and store it.
          try {
            await this._handleSuccess(message, options?.onSuccess);
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
    await _deleteStorage(this._storage);

    // Reset this auth client to a non-authenticated state.
    this._identity = new AnonymousIdentity();
    this._chain = null;

    if (options.returnTo) {
      try {
        window.history.pushState({}, '', options.returnTo);
      } catch {
        window.location.href = options.returnTo;
      }
    }
  }
}

async function _deleteStorage(storage: AuthClientStorage) {
  await storage.remove(KEY_STORAGE_KEY);
  await storage.remove(KEY_STORAGE_DELEGATION);
  await storage.remove(KEY_VECTOR);
}

function mergeLoginOptions(
  loginOptions: AuthClientLoginOptions | undefined,
  otherLoginOptions: AuthClientLoginOptions | undefined,
): AuthClientLoginOptions | undefined {
  if (!loginOptions && !otherLoginOptions) {
    return undefined;
  }

  const customValues =
    loginOptions?.customValues || otherLoginOptions?.customValues
      ? {
          ...loginOptions?.customValues,
          ...otherLoginOptions?.customValues,
        }
      : undefined;

  return {
    ...loginOptions,
    ...otherLoginOptions,
    customValues,
  };
}
