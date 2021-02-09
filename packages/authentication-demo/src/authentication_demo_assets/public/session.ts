import { makeLog } from "@dfinity/agent";
import tweetnacl from "tweetnacl";
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

/**
 * Create a KeyPair for the Session.
 * @param session - session containing keyPair secretKey
 */
export function SessionKeyPair(session: AuthenticationDemoSession): tweetnacl.SignKeyPair {
  return tweetnacl.sign.keyPair.fromSecretKey(hexToBytes(session.identity.secretKey.hex));
}

const ed25519PublicKeyDerPrefix = hexToBytes('302a300506032b6570032100');

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
  const publicKey = {
    toDer() {
      return Uint8Array.from([
        ...ed25519PublicKeyDerPrefix,
        ...keyPair.publicKey,
      ]);
    }
  }
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
const defaultSessionStringStorage = KeyedLocalStorage(
  localStorage,
  "ic-id-rp-session"
);

/**
 * Storage for Session Identities.
 * @param stringStorage - place to store stringified session identities. Defaults to localStorage key ic-id-rp-session
 */
export function SessionJsonStorage(
  stringStorage: SimpleStorage<string> = defaultSessionStringStorage
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
  const secretKey = hexToBytes(options.secretKey.hex);
  return async (challenge) => {
    return tweetnacl.sign.detached(new Uint8Array(challenge), secretKey)
  };
}
