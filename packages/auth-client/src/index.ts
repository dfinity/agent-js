import {
  AnonymousIdentity,
  Identity,
  Principal,
  SignIdentity,
} from '@dfinity/agent';
import { createAuthenticationRequestUrl } from '@dfinity/authentication';
import {
  DelegationChain,
  DelegationIdentity,
  Ed25519KeyIdentity,
} from '@dfinity/identity';

const KEY_LOCALSTORAGE_KEY = 'ic-identity';
const KEY_LOCALSTORAGE_DELEGATION = 'ic-delegation';

export interface AuthClientOptions {
  identityProvider?: string | URL;
  identity?: SignIdentity;
  storage?: AuthClientStorage;
}

export interface AuthClientStorage {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
}

export class LocalStorage implements AuthClientStorage {
  constructor(
    public readonly prefix = 'ic-',
    private readonly _localStorage?: Storage,
  ) {}

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

    const ls = typeof window === 'undefined'
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

export class AuthClient {
  private _identity: Identity;
  private _key: SignIdentity | null;
  private _chain: DelegationChain | null;
  private _storage: AuthClientStorage;

  constructor(options: AuthClientOptions = {}) {
    this._storage = options.storage ?? new LocalStorage('ic-');

    let key = null;
    if (options.identity) {
      key = options.identity;
    } else {
      const maybeIdentityStorage = localStorage.getItem(KEY_LOCALSTORAGE_KEY);
      if (maybeIdentityStorage) {
        try {
          key = Ed25519KeyIdentity.fromJSON(maybeIdentityStorage);
        } catch (e) {
          // Ignore this, this means that the localStorage value isn't a valid Ed25519KeyIdentity
          // serialization.
        }
      }
    }

    this._identity = new AnonymousIdentity();
    this._key = key;
    this._chain = null;

    if (key) {
      try {
        const chainStorage = localStorage.getItem(KEY_LOCALSTORAGE_DELEGATION);
        if (chainStorage) {
          const chain = DelegationChain.fromJSON(chainStorage);

          // Verify that the delegation isn't expired.
          let valid = true;
          for (const { delegation } of chain.delegations) {
            // prettier-ignore
            if (+new Date(Number(delegation.expiration / BigInt(1000000))) <= +Date.now()) {
              valid = false;
            }
          }
          if (valid) {
            this._chain = chain;
            this._identity = DelegationIdentity.fromDelegation(key, chain);
          } else {
            // If any delegation is expired, we logout and ask you to log back in.
            this._deleteStorage();
          }
        }
      } catch (e) {}
    }
  }

  getIdentity() {
    return this._identity;
  }

  isAuthenticated() {
    return (
      !this.getIdentity().getPrincipal().isAnonymous() && this._chain !== null
    );
  }

  _getAccessToken(location: Location) {
    try {
      // Remove the `#` at the start.
      const hashParams = new URLSearchParams(location.hash.substr(1));

      return hashParams.get("access_token") || null;
    } catch (e) {
      // Ignore errors. Return false in that case (maybe the hash params cannot be parsed?).
    }

    return null;
  }

  shouldParseResult(location: Location) {
    return this._getAccessToken(location) !== null;
  }

  async handleRedirectCallback(location: Location) {
    const maybeToken = this._getAccessToken(location);
    if (!maybeToken) {
      return;
    }
    const key = this._key;
    if (!key) {
      return;
    }

    // Parse the token which is a JSON object serialized in Hex form.
    const chainJson = [...maybeToken]
      .reduce((acc, curr, i) => {
        acc[Math.floor(i / 2)] = (acc[(i / 2) | 0] || "") + curr;
        return acc;
      }, [] as string[])
      .map((x) => Number.parseInt(x, 16))
      .map((x) => String.fromCharCode(x))
      .join("");
    this._chain = DelegationChain.fromJSON(chainJson);
    localStorage.setItem(
      KEY_LOCALSTORAGE_DELEGATION,
      JSON.stringify(this._chain.toJSON())
    );
    this._identity = DelegationIdentity.fromDelegation(key, this._chain);

    return {
      identity: this._identity,
    };
  }

  async logout(options: { returnTo?: string } = {}) {
    this._deleteStorage();

    if (options.returnTo) {
      try {
        window.history.pushState({}, '', options.returnTo);
      } catch (e) {
        window.location.href = options.returnTo;
      }
    }
  }

  async loginWithRedirect(
    options: { redirectUri?: string; scope?: Principal[] } = {}
  ) {
    let key = this._key;
    if (!key) {
      // Create a new key (whether or not one was in storage).
      key = Ed25519KeyIdentity.generate();
      this._key = key;
      localStorage.setItem(KEY_LOCALSTORAGE_KEY, JSON.stringify(key));
    }

    await this._auth.sendAuthenticationRequest({
      session: {
        identity: key,
      },
      redirectUri: new URL(options.redirectUri || window.location.href),
      scope:
        options.scope?.map((x) => ({ type: "CanisterScope", principal: x })) ??
        [],
    });
  }

  private async _deleteStorage() {
    await this._storage.remove(KEY_LOCALSTORAGE_KEY);
    await this._storage.remove(KEY_LOCALSTORAGE_DELEGATION);

    // Reset this auth client to a non-authenticated state.
    this._identity = new AnonymousIdentity();
    this._key = null;
    this._chain = null;
  }
}

