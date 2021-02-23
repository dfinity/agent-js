import { HttpAgent, AnonymousIdentity, Principal, SignIdentity } from '@dfinity/agent';
import {
  Authenticator,
  DelegationChain,
  DelegationIdentity,
  Ed25519KeyIdentity
} from '@dfinity/authentication';

// TODO: move this into @dfinity/authentication
const KEY_LOCALSTORAGE_KEY = 'ic-identity';
const KEY_LOCALSTORAGE_DELEGATION = 'ic-delegation';
const DEFAULT_IDP_URL = 'https://auth.ic0.app/';

export class AuthenticationClient {
  constructor(options = {}) {
    const idpUrl = new URL(options.identityProvider || DEFAULT_IDP_URL);
    this._auth = new Authenticator({
      identityProvider: {
        url: idpUrl,
      }
    });

    let key = null;
    if (options.identity && options.identity instanceof SignIdentity) {
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
        this._chain = DelegationChain.fromJSON(localStorage.getItem(KEY_LOCALSTORAGE_DELEGATION));
        this._identity = DelegationIdentity.fromDelegation(this._key, this._chain);
      } catch (e) {
      }
    }
  }

  getIdentity() {
    return this._identity;
  }

  isAuthenticated() {
    return !this.getIdentity().getPrincipal().isAnonymous() && this._chain !== null;
  }

  _getAccessToken(location) {
    try {
      const searchParams = new URLSearchParams(location.search);
      // Remove the `#` at the start.
      const hashParams = new URLSearchParams(location.hash.substr(1));

      return searchParams.get('access_token') || hashParams.get('access_token') || null;
    } catch (e) {
      // Ignore errors. Return false in that case (maybe the hash params cannot be parsed?).
    }

    return null;
  }

  shouldParseResult(location) {
    return this._getAccessToken(location) !== null;
  }

  handleRedirectCallback(location) {
    const maybeToken = this._getAccessToken(location);
    if (!maybeToken) {
      console.log('no token...');
      return;
    }

    // Parse the token which is a JSON object serialized in Hex form.
    const chainJson = [...maybeToken]
      .reduce((acc, curr, i) => {
        acc[Math.floor(i/2)] = (acc[i/2 | 0] || "") + curr;
        return acc;
      }, [])
      .map(x => Number.parseInt(x, 16))
      .map(x => String.fromCharCode(x))
      .join('');
    this._chain = DelegationChain.fromJSON(chainJson);
    localStorage.setItem(KEY_LOCALSTORAGE_DELEGATION, JSON.stringify(this._chain.toJSON()));
    this._identity = DelegationIdentity.fromDelegation(this._key, this._chain);

    return {
      identity: this._identity,
    }
  }

  async logout(options = {}) {
    localStorage.removeItem(KEY_LOCALSTORAGE_KEY);
    localStorage.removeItem(KEY_LOCALSTORAGE_DELEGATION);
    // Reset this auth client to a non-authenticated state.
    this._identity = new AnonymousIdentity();
    this._key = null;
    this._chain = null;

    if (options.returnTo) {
      try {
        window.history.pushState({}, "", options.returnTo);
      } catch (e) {
        window.location = options.returnTo;
      }
    }
  }

  async loginWithRedirect(options = {}) {
    if (this.getIdentity().getPrincipal().isAnonymous()) {
      // Create a new key (whether or not one was in storage).
      this._key = Ed25519KeyIdentity.generate();
      localStorage.setItem(KEY_LOCALSTORAGE_KEY, JSON.stringify(this._key.toJSON()));
    }

    await this._auth.sendAuthenticationRequest({
      session: {
        identity: this._key,
      },
      redirectUri: options.redirectUri || window.location.href,
      scope: options.scope ?? [],
    });
  }
}
