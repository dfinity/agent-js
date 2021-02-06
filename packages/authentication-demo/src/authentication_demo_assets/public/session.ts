import { Ed25519KeyIdentity, Ed25519PublicKey } from "@dfinity/authentication";
import { hexToBytes } from "@dfinity/authentication/.tsc-out/packages/authentication/src/idp-protocol/bytes";
import { makeLog, blobFromUint8Array } from "@dfinity/agent";

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
 * Get the PublicKey for a Session
 * @param session - session
 */
export function SessionPublicKey(
  session: AuthenticationDemoSession
): Ed25519PublicKey {
  const secretKeyBytes = hexToBytes(session.identity.secretKey.hex);
  const publicKeyBytes = secretKeyBytes.slice(secretKeyBytes.length / -2);
  const publicKey = Ed25519PublicKey.fromRaw(
    blobFromUint8Array(publicKeyBytes)
  );
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

export const defaultSessionStorage = SessionJsonStorage();

// /**
//  * Helper to check/assert object has prop.
//  * Gratitude to https://fettblog.eu/typescript-hasownproperty/.
//  * @param obj - object to check
//  * @param prop - name of property to check for existence of.
//  */
// function hasOwnProperty<X, Y extends PropertyKey>(obj: X, prop: Y): obj is X & Record<Y, unknown> {
//   return {}.hasOwnProperty.call(obj, prop);
// }

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
  const identity = Ed25519KeyIdentity.fromSecretKey(
    hexToBytes(options.secretKey.hex)
  );
  return async (challenge) => {
    return identity.sign(challenge);
  };
}
