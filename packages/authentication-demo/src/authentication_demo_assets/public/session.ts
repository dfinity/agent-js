import { Ed25519KeyIdentity, makeLog } from "@dfinity/authentication";
import { hexToBytes } from "./bytes";

export const defaultSessionStorage = SessionJsonStorage();

export interface AuthenticationDemoSession {
  // url
  authenticationResponse?: string;
  identity: {
    secretKey: {
      hex: string;
    };
  };
}

function SessionIdentity(session: AuthenticationDemoSession) {
  const id = Ed25519KeyIdentity.fromSecretKey(
    hexToBytes(session.identity.secretKey.hex)
  );
  return id;
}

/**
 * Create a KeyPair for the Session.
 * @param session - session containing keyPair secretKey
 */
export function SessionKeyPair(
  session: AuthenticationDemoSession
): ReturnType<Ed25519KeyIdentity["getKeyPair"]> {
  const id = SessionIdentity(session);
  return id.getKeyPair();
}

// const ed25519PublicKeyDerPrefix = hexToBytes('302a300506032b6570032100');

/**
 * Get the PublicKey for a Session
 * @param session - session
 */
export function SessionPublicKey(
  session: AuthenticationDemoSession
): {
  toDer(): Uint8Array;
} {
  const keyPair = SessionKeyPair(session);
  const publicKey = keyPair.publicKey;
  return publicKey;
}

type SimpleStorage<S> = {
  get(): Promise<
    { empty: true; value?: undefined } | { empty: false; value: S }
  >;
  set(s: S): Promise<void>;
};

function KeyedLocalStorage(
  domLocalStorage: typeof localStorage,
  key: string
): SimpleStorage<string> {
  return Object.freeze({
    async get() {
      const value = domLocalStorage.getItem(key);
      if (value === null) {
        return { empty: true };
      }
      return { empty: false, value };
    },
    async set(v) {
      domLocalStorage.setItem(key, v);
    },
  });
}

function DefaultSessionStringStorage() {
  const defaultSessionStringStorage = KeyedLocalStorage(
    localStorage,
    "ic-id-rp-session"
  );
  return defaultSessionStringStorage;
}

/**
 * Storage for Session Identities.
 * @param stringStorage - place to store stringified session identities. Defaults to localStorage key ic-id-rp-session
 */
export function SessionJsonStorage(
  stringStorage: SimpleStorage<string> = DefaultSessionStringStorage()
): SimpleStorage<AuthenticationDemoSession> {
  const log = makeLog("SessionJsonStorage");
  return {
    async get() {
      const stored = await stringStorage.get();
      if (stored.empty) {
        return stored;
      }
      const parsed = JSON.parse(stored.value);
      const authenticationResponse = parsed?.authenticationResponse;
      if (!["string", "undefined"].includes(typeof authenticationResponse)) {
        log("warn", "json authenticationResponse is not string");
        return { empty: true };
      }
      const identity = parsed?.identity;
      if (typeof identity !== "object") {
        log("warn", "json identity is not object");
        return { empty: true };
      }
      return { empty: false, value: parsed };
    },
    async set(value: AuthenticationDemoSession) {
      const string = JSON.stringify(value);
      await stringStorage.set(string);
    },
  };
}

type SignFunction = (challenge: ArrayBuffer) => Promise<ArrayBuffer>;

/**
 * Create a SignFunction for a Session
 * @param options options
 * @param options.secretKey - secretKey
 * @param options.secretKey.hex - hex of ed25519 secretKey
 */
export function SessionIdentitySignFunction(options: {
  secretKey: {
    hex: string;
  };
}): SignFunction {
  const id = SessionIdentity({ identity: options });
  return async (challenge) => {
    return id.sign(challenge);
  };
}
