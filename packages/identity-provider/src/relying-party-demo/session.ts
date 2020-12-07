import { Ed25519KeyIdentity } from '@dfinity/authentication';
import { hexToBytes, hexEncodeUintArray } from 'src/bytes';
import { blobFromUint8Array } from '@dfinity/agent';
import { IStorage } from './storage';

export interface IRelyingPartyAuthenticationSession {
  type: 'RelyingPartyAuthenticationSession';
  identity: Ed25519KeyIdentity;
}

export const RelyingPartyAuthenticationSessionSerializer = {
  toJSON(session: IRelyingPartyAuthenticationSession) {
    return JSON.stringify(session, toJSONReplacer, 2);
  },
  fromJSON(serialiedSession: string) {
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

/** Replacer function for JSON.stringify that will encode Buffers as hex */
function toJSONReplacer<
  T extends { [P in keyof T]?: undefined | { [key: string]: any } },
  K extends keyof T = keyof T,
  V extends T[K] = T[K]
>(this: T | undefined, key: K, value: V): any {
  if (value instanceof Ed25519KeyIdentity) {
    const publicKeyDer = value.getKeyPair().publicKey.toDer();
    return {
      type: 'Ed25519KeyIdentity',
      // un-DER by taking only last 32 bytes (raw)
      publicKey: publicKeyDer.slice(publicKeyDer.length - 32),
      secretKey: value.getKeyPair().secretKey,
    };
  }
  if (value instanceof Uint8Array) {
    return {
      type: 'Uint8Array',
      hex: hexEncodeUintArray(value),
    };
  }
  if (value?.type === 'Buffer' && Array.isArray(value?.data)) {
    return {
      type: 'Buffer',
      hex: hexEncodeUintArray(Uint8Array.from(value.data)),
    };
  }
  return value;
}
