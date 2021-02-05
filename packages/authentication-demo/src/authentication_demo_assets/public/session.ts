import { Ed25519KeyIdentity } from "@dfinity/authentication";

type SimpleStorage<S> = {
  get(): Promise<{ empty: true } | { empty: false; value: S }>;
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
export function SessionIdentityStorage(
  stringStorage: SimpleStorage<string> = defaultSessionStringStorage
): SimpleStorage<Ed25519KeyIdentity> {
  return {
    async get() {
      const stored = await stringStorage.get();
      if (stored.empty) {
        return stored;
      }
      const parsed = Ed25519KeyIdentity.fromJSON(stored.value);
      return { empty: false, value: parsed };
    },
    async set(value: Ed25519KeyIdentity) {
      const string = JSON.stringify(value.toJSON());
      await stringStorage.set(string);
    },
  };
}

export const defaultSessionIdentityStorage = SessionIdentityStorage();
