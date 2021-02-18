import { Ed25519KeyIdentity } from '@dfinity/authentication';
import { hexToBytes, hexEncodeUintArray } from 'src/bytes';
import { blobFromUint8Array } from '@dfinity/agent';
import { IStorage } from './storage';

export interface IRelyingPartyAuthenticationSession {
  type: 'RelyingPartyAuthenticationSession';
  identity: Ed25519KeyIdentity;
}

type JsonSerializer<T> = {
  toJSON(value: T): string;
  fromJSON(maybeJsonString: string): T;
};

export const RelyingPartyAuthenticationSessionSerializer: JsonSerializer<IRelyingPartyAuthenticationSession> = {
  toJSON(session: IRelyingPartyAuthenticationSession) {
    console.debug('RelyingPartyAuthenticationSessionSerializer.toJSON', { session });
    return JSON.stringify(session, toJSONReplacer, 2);
  },
  fromJSON(serialiedSession: string) {
    console.debug('RelyingPartyAuthenticationSessionSerializer.fromJSON', { serialiedSession });
    const parsed = JSON.parse(serialiedSession);
    const publicKey = Uint8Array.from(hexToBytes(parsed.identity.publicKey.hex));
    const secretKey = Uint8Array.from(hexToBytes(parsed.identity.secretKey.hex));
    const session: IRelyingPartyAuthenticationSession = {
      type: 'RelyingPartyAuthenticationSession',
      identity: Ed25519KeyIdentity.fromKeyPair(
        blobFromUint8Array(publicKey),
        blobFromUint8Array(secretKey),
      ),
    };
    return session;
  },
};

/**
 * Store sessions in localstorage as JSON strings.
 * @param storageKey - localStorage key to use for storage
 */
export function RelyingPartyAuthenticationSessionStorage(
  storageKey: string,
): IStorage<IRelyingPartyAuthenticationSession> {
  return {
    get() {
      const storedString = localStorage.getItem(storageKey);
      if (!storedString) {
        return;
      }
      return RelyingPartyAuthenticationSessionSerializer.fromJSON(storedString);
    },
    set(session: IRelyingPartyAuthenticationSession) {
      const serialized = RelyingPartyAuthenticationSessionSerializer.toJSON(session);
      globalThis.localStorage.setItem(storageKey, serialized);
    },
  };
}

/**
 * Replacer function for JSON.stringify that will encode Buffers as hex.
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify#the_replacer_parameter
 * @param propertyName - name of property being accessed in `this`
 * @param value - value being stringified
 */
function toJSONReplacer(propertyName: unknown, value: unknown) {
  // handle objects with a 'type' property
  if (typeof value === 'object' && value && hasOwnProperty(value, 'type')) {
    switch (value.type) {
      case 'Buffer':
        if (!(hasOwnProperty(value, 'data') && Array.isArray(value?.data))) {
          break;
        }
        return {
          type: 'Buffer',
          hex: hexEncodeUintArray(Uint8Array.from(value.data)),
        };
      case 'RelyingPartyAuthenticationSession': {
        const identity =
          hasOwnProperty(value, 'identity') && value.identity instanceof Ed25519KeyIdentity
            ? value.identity
            : undefined;
        if (!identity) {
          break;
        }
        const { publicKey, secretKey } = identity.getKeyPair();
        const publicKeyDer = publicKey.toDer();
        return {
          ...value,
          // replace identity with POJO,
          identity: {
            type: 'Ed25519KeyIdentity',
            // un-DER by taking only last 32 bytes (raw)
            publicKey: publicKeyDer.slice(publicKeyDer.length - 32),
            secretKey,
          },
        };
      }
    }
  }
  if (value instanceof Uint8Array) {
    return {
      type: 'Uint8Array',
      hex: hexEncodeUintArray(value),
    };
  }
  return value;
}

/**
 * Helper to check/assert object has prop.
 * Gratitude to https://fettblog.eu/typescript-hasownproperty/.
 * @param obj - object to check
 * @param prop - name of property to check for existence of.
 */
function hasOwnProperty<X, Y extends PropertyKey>(obj: X, prop: Y): obj is X & Record<Y, unknown> {
  return {}.hasOwnProperty.call(obj, prop);
}
