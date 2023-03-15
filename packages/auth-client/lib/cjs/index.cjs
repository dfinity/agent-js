'use strict';
var __createBinding =
  (this && this.__createBinding) ||
  (Object.create
    ? function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        var desc = Object.getOwnPropertyDescriptor(m, k);
        if (!desc || ('get' in desc ? !m.__esModule : desc.writable || desc.configurable)) {
          desc = {
            enumerable: true,
            get: function () {
              return m[k];
            },
          };
        }
        Object.defineProperty(o, k2, desc);
      }
    : function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        o[k2] = m[k];
      });
var __exportStar =
  (this && this.__exportStar) ||
  function (m, exports) {
    for (var p in m)
      if (p !== 'default' && !Object.prototype.hasOwnProperty.call(exports, p))
        __createBinding(exports, m, p);
  };
Object.defineProperty(exports, '__esModule', { value: true });
exports.AuthClient =
  exports.ERROR_USER_INTERRUPT =
  exports.IdbKeyVal =
  exports.KEY_STORAGE_KEY =
  exports.KEY_STORAGE_DELEGATION =
  exports.LocalStorage =
  exports.IdbStorage =
    void 0;
const agent_1 = require('@dfinity/agent');
const identity_1 = require('@dfinity/identity');
const idleManager_js_1 = require('./idleManager.js');
const storage_js_1 = require('./storage.js');
var storage_js_2 = require('./storage.js');
Object.defineProperty(exports, 'IdbStorage', {
  enumerable: true,
  get: function () {
    return storage_js_2.IdbStorage;
  },
});
Object.defineProperty(exports, 'LocalStorage', {
  enumerable: true,
  get: function () {
    return storage_js_2.LocalStorage;
  },
});
Object.defineProperty(exports, 'KEY_STORAGE_DELEGATION', {
  enumerable: true,
  get: function () {
    return storage_js_2.KEY_STORAGE_DELEGATION;
  },
});
Object.defineProperty(exports, 'KEY_STORAGE_KEY', {
  enumerable: true,
  get: function () {
    return storage_js_2.KEY_STORAGE_KEY;
  },
});
var db_js_1 = require('./db.js');
Object.defineProperty(exports, 'IdbKeyVal', {
  enumerable: true,
  get: function () {
    return db_js_1.IdbKeyVal;
  },
});
const IDENTITY_PROVIDER_DEFAULT = 'https://identity.ic0.app';
const IDENTITY_PROVIDER_ENDPOINT = '#authorize';
const ECDSA_KEY_LABEL = 'ECDSA';
const ED25519_KEY_LABEL = 'Ed25519';
const INTERRUPT_CHECK_INTERVAL = 500;
exports.ERROR_USER_INTERRUPT = 'UserInterrupt';
__exportStar(require('./idleManager.js'), exports);
/**
 * Tool to manage authentication and identity
 * @see {@link AuthClient}
 */
class AuthClient {
  constructor(
    _identity,
    _key,
    _chain,
    _storage,
    idleManager,
    _createOptions,
    // A handle on the IdP window.
    _idpWindow,
    // The event handler for processing events from the IdP.
    _eventHandler,
  ) {
    var _a;
    this._identity = _identity;
    this._key = _key;
    this._chain = _chain;
    this._storage = _storage;
    this.idleManager = idleManager;
    this._createOptions = _createOptions;
    this._idpWindow = _idpWindow;
    this._eventHandler = _eventHandler;
    const logout = this.logout.bind(this);
    const idleOptions =
      _createOptions === null || _createOptions === void 0 ? void 0 : _createOptions.idleOptions;
    /**
     * Default behavior is to clear stored identity and reload the page.
     * By either setting the disableDefaultIdleCallback flag or passing in a custom idle callback, we will ignore this config
     */
    if (
      !(idleOptions === null || idleOptions === void 0 ? void 0 : idleOptions.onIdle) &&
      !(idleOptions === null || idleOptions === void 0
        ? void 0
        : idleOptions.disableDefaultIdleCallback)
    ) {
      (_a = this.idleManager) === null || _a === void 0
        ? void 0
        : _a.registerCallback(() => {
            logout();
            location.reload();
          });
    }
  }
  /**
   * Create an AuthClient to manage authentication and identity
   * @constructs {@link AuthClient}
   * @param {AuthClientCreateOptions} options
   * @see {@link AuthClientCreateOptions}
   * @param options.identity Optional Identity to use as the base
   * @see {@link SignIdentity}
   * @param options.storage Storage mechanism for delegration credentials
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
  static async create(options = {}) {
    var _a, _b, _c;
    const storage =
      (_a = options.storage) !== null && _a !== void 0 ? _a : new storage_js_1.IdbStorage();
    const keyType = (_b = options.keyType) !== null && _b !== void 0 ? _b : ECDSA_KEY_LABEL;
    let key = null;
    if (options.identity) {
      key = options.identity;
    } else {
      let maybeIdentityStorage = await storage.get(storage_js_1.KEY_STORAGE_KEY);
      if (!maybeIdentityStorage && storage_js_1.isBrowser) {
        // Attempt to migrate from localstorage
        try {
          const fallbackLocalStorage = new storage_js_1.LocalStorage();
          const localChain = await fallbackLocalStorage.get(storage_js_1.KEY_STORAGE_DELEGATION);
          const localKey = await fallbackLocalStorage.get(storage_js_1.KEY_STORAGE_KEY);
          // not relevant for Ed25519
          if (localChain && localKey && keyType === ECDSA_KEY_LABEL) {
            console.log('Discovered an identity stored in localstorage. Migrating to IndexedDB');
            await storage.set(storage_js_1.KEY_STORAGE_DELEGATION, localChain);
            await storage.set(storage_js_1.KEY_STORAGE_KEY, localKey);
            maybeIdentityStorage = localChain;
            // clean up
            await fallbackLocalStorage.remove(storage_js_1.KEY_STORAGE_DELEGATION);
            await fallbackLocalStorage.remove(storage_js_1.KEY_STORAGE_KEY);
          }
        } catch (error) {
          console.error('error while attempting to recover localstorage: ' + error);
        }
      }
      if (maybeIdentityStorage) {
        try {
          if (typeof maybeIdentityStorage === 'object') {
            if (keyType === ED25519_KEY_LABEL && typeof maybeIdentityStorage === 'string') {
              key = await identity_1.Ed25519KeyIdentity.fromJSON(maybeIdentityStorage);
            } else {
              key = await identity_1.ECDSAKeyIdentity.fromKeyPair(maybeIdentityStorage);
            }
          } else if (typeof maybeIdentityStorage === 'string') {
            // This is a legacy identity, which is a serialized Ed25519KeyIdentity.
            key = identity_1.Ed25519KeyIdentity.fromJSON(maybeIdentityStorage);
          }
        } catch (e) {
          // Ignore this, this means that the localStorage value isn't a valid Ed25519KeyIdentity or ECDSAKeyIdentity
          // serialization.
        }
      }
    }
    let identity = new agent_1.AnonymousIdentity();
    let chain = null;
    if (key) {
      try {
        const chainStorage = await storage.get(storage_js_1.KEY_STORAGE_DELEGATION);
        if (typeof chainStorage === 'object' && chainStorage !== null) {
          throw new Error(
            'Delegation chain is incorrectly stored. A delegation chain should be stored as a string.',
          );
        }
        if (options.identity) {
          identity = options.identity;
        } else if (chainStorage) {
          chain = identity_1.DelegationChain.fromJSON(chainStorage);
          // Verify that the delegation isn't expired.
          if (!(0, identity_1.isDelegationValid)(chain)) {
            await _deleteStorage(storage);
            key = null;
          } else {
            identity = identity_1.DelegationIdentity.fromDelegation(key, chain);
          }
        }
      } catch (e) {
        console.error(e);
        // If there was a problem loading the chain, delete the key.
        await _deleteStorage(storage);
        key = null;
      }
    }
    let idleManager = undefined;
    if ((_c = options.idleOptions) === null || _c === void 0 ? void 0 : _c.disableIdle) {
      idleManager = undefined;
    }
    // if there is a delegation chain or provided identity, setup idleManager
    else if (chain || options.identity) {
      idleManager = idleManager_js_1.IdleManager.create(options.idleOptions);
    }
    if (!key) {
      // Create a new key (whether or not one was in storage).
      if (keyType === ED25519_KEY_LABEL) {
        key = await identity_1.Ed25519KeyIdentity.generate();
        await storage.set(storage_js_1.KEY_STORAGE_KEY, JSON.stringify(key.toJSON()));
      } else {
        if (options.storage && keyType === ECDSA_KEY_LABEL) {
          console.warn(
            `You are using a custom storage provider that may not support CryptoKey storage. If you are using a custom storage provider that does not support CryptoKey storage, you should use '${ED25519_KEY_LABEL}' as the key type, as it can serialize to a string`,
          );
        }
        key = await identity_1.ECDSAKeyIdentity.generate();
        await storage.set(storage_js_1.KEY_STORAGE_KEY, key.getKeyPair());
      }
    }
    return new this(identity, key, chain, storage, idleManager, options);
  }
  _handleSuccess(message, onSuccess) {
    var _a, _b, _c;
    const delegations = message.delegations.map(signedDelegation => {
      return {
        delegation: new identity_1.Delegation(
          signedDelegation.delegation.pubkey,
          signedDelegation.delegation.expiration,
          signedDelegation.delegation.targets,
        ),
        signature: signedDelegation.signature.buffer,
      };
    });
    const delegationChain = identity_1.DelegationChain.fromDelegations(
      delegations,
      message.userPublicKey.buffer,
    );
    const key = this._key;
    if (!key) {
      return;
    }
    this._chain = delegationChain;
    this._identity = identity_1.DelegationIdentity.fromDelegation(key, this._chain);
    (_a = this._idpWindow) === null || _a === void 0 ? void 0 : _a.close();
    if (!this.idleManager) {
      const idleOptions =
        (_b = this._createOptions) === null || _b === void 0 ? void 0 : _b.idleOptions;
      this.idleManager = idleManager_js_1.IdleManager.create(idleOptions);
      if (
        !(idleOptions === null || idleOptions === void 0 ? void 0 : idleOptions.onIdle) &&
        !(idleOptions === null || idleOptions === void 0
          ? void 0
          : idleOptions.disableDefaultIdleCallback)
      ) {
        (_c = this.idleManager) === null || _c === void 0
          ? void 0
          : _c.registerCallback(() => {
              this.logout();
              location.reload();
            });
      }
    }
    onSuccess === null || onSuccess === void 0 ? void 0 : onSuccess();
    this._removeEventListener();
    delete this._idpWindow;
  }
  getIdentity() {
    return this._identity;
  }
  async isAuthenticated() {
    return !this.getIdentity().getPrincipal().isAnonymous() && this._chain !== null;
  }
  /**
   * AuthClient Login -
   * Opens up a new window to authenticate with Internet Identity
   * @param {AuthClientLoginOptions} options
   * @param options.identityProvider Identity provider
   * @param options.maxTimeToLive Expiration of the authentication in nanoseconds
   * @param options.derivationOrigin Origin for Identity Provider to use while generating the delegated identity
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
  async login(options) {
    var _a, _b, _c, _d;
    // Set default maxTimeToLive to 8 hours
    const defaultTimeToLive = /* hours */ BigInt(8) * /* nanoseconds */ BigInt(3600000000000);
    // Create the URL of the IDP. (e.g. https://XXXX/#authorize)
    const identityProviderUrl = new URL(
      ((_a = options === null || options === void 0 ? void 0 : options.identityProvider) === null ||
      _a === void 0
        ? void 0
        : _a.toString()) || IDENTITY_PROVIDER_DEFAULT,
    );
    // Set the correct hash if it isn't already set.
    identityProviderUrl.hash = IDENTITY_PROVIDER_ENDPOINT;
    // If `login` has been called previously, then close/remove any previous windows
    // and event listeners.
    (_b = this._idpWindow) === null || _b === void 0 ? void 0 : _b.close();
    this._removeEventListener();
    // Add an event listener to handle responses.
    this._eventHandler = this._getEventHandler(
      identityProviderUrl,
      Object.assign(
        {
          maxTimeToLive:
            (_c = options === null || options === void 0 ? void 0 : options.maxTimeToLive) !==
              null && _c !== void 0
              ? _c
              : defaultTimeToLive,
        },
        options,
      ),
    );
    window.addEventListener('message', this._eventHandler);
    // Open a new window with the IDP provider.
    this._idpWindow =
      (_d = window.open(
        identityProviderUrl.toString(),
        'idpWindow',
        options === null || options === void 0 ? void 0 : options.windowOpenerFeatures,
      )) !== null && _d !== void 0
        ? _d
        : undefined;
    // Check if the _idpWindow is closed by user.
    const checkInterruption = () => {
      // The _idpWindow is opened and not yet closed by the client
      if (this._idpWindow) {
        if (this._idpWindow.closed) {
          this._handleFailure(
            exports.ERROR_USER_INTERRUPT,
            options === null || options === void 0 ? void 0 : options.onError,
          );
        } else {
          setTimeout(checkInterruption, INTERRUPT_CHECK_INTERVAL);
        }
      }
    };
    checkInterruption();
  }
  _getEventHandler(identityProviderUrl, options) {
    return async event => {
      var _a, _b, _c;
      if (event.origin !== identityProviderUrl.origin) {
        console.warn(
          `WARNING: expected origin '${identityProviderUrl.origin}', got '${event.origin}' (ignoring)`,
        );
        return;
      }
      const message = event.data;
      switch (message.kind) {
        case 'authorize-ready': {
          // IDP is ready. Send a message to request authorization.
          const request = {
            kind: 'authorize-client',
            sessionPublicKey: new Uint8Array(
              (_a = this._key) === null || _a === void 0 ? void 0 : _a.getPublicKey().toDer(),
            ),
            maxTimeToLive: options === null || options === void 0 ? void 0 : options.maxTimeToLive,
            derivationOrigin:
              (_b = options === null || options === void 0 ? void 0 : options.derivationOrigin) ===
                null || _b === void 0
                ? void 0
                : _b.toString(),
          };
          (_c = this._idpWindow) === null || _c === void 0
            ? void 0
            : _c.postMessage(request, identityProviderUrl.origin);
          break;
        }
        case 'authorize-client-success':
          // Create the delegation chain and store it.
          try {
            this._handleSuccess(
              message,
              options === null || options === void 0 ? void 0 : options.onSuccess,
            );
            // Setting the storage is moved out of _handleSuccess to make
            // it a sync function. Having _handleSuccess as an async function
            // messes up the jest tests for some reason.
            if (this._chain) {
              await this._storage.set(
                storage_js_1.KEY_STORAGE_DELEGATION,
                JSON.stringify(this._chain.toJSON()),
              );
            }
          } catch (err) {
            this._handleFailure(
              err.message,
              options === null || options === void 0 ? void 0 : options.onError,
            );
          }
          break;
        case 'authorize-client-failure':
          this._handleFailure(
            message.text,
            options === null || options === void 0 ? void 0 : options.onError,
          );
          break;
        default:
          break;
      }
    };
  }
  _handleFailure(errorMessage, onError) {
    var _a;
    (_a = this._idpWindow) === null || _a === void 0 ? void 0 : _a.close();
    onError === null || onError === void 0 ? void 0 : onError(errorMessage);
    this._removeEventListener();
    delete this._idpWindow;
  }
  _removeEventListener() {
    if (this._eventHandler) {
      window.removeEventListener('message', this._eventHandler);
    }
    this._eventHandler = undefined;
  }
  async logout(options = {}) {
    await _deleteStorage(this._storage);
    // Reset this auth client to a non-authenticated state.
    this._identity = new agent_1.AnonymousIdentity();
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
exports.AuthClient = AuthClient;
async function _deleteStorage(storage) {
  await storage.remove(storage_js_1.KEY_STORAGE_KEY);
  await storage.remove(storage_js_1.KEY_STORAGE_DELEGATION);
  await storage.remove(storage_js_1.KEY_VECTOR);
}
//# sourceMappingURL=index.js.map
