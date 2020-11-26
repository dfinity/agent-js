import { Identity, KeyPair, PublicKey } from '@dfinity/agent';
import {
  Bip39Ed25519KeyIdentity,
  DelegationChain,
  Ed25519KeyIdentity,
  Ed25519PublicKey,
} from '@dfinity/authentication';
import localforage from 'localforage';
import React, { ComponentProps, createContext, useContext, useEffect, useState } from 'react';
import { LOCAL_STORAGE_ROOT_CREDENTIAL, LOCAL_STORAGE_WEBAUTHN_ID } from '../utils/constants';

const noop = () => {};

export interface UseAuthContext {
  rootIdentity?: Bip39Ed25519KeyIdentity;
  sessionKey?: PublicKey;
  rootDelegationChain?: DelegationChain;
  sessionDelegationChain?: DelegationChain;
  webauthnId?: Ed25519KeyIdentity;
  setRootIdentity: (identity: Bip39Ed25519KeyIdentity) => void;
  setSessionKey: (key: PublicKey) => void;
  setWebauthnId: (id: Ed25519KeyIdentity) => void;
  setRootDelegationChain: (id: DelegationChain) => void;
  setSessionDelegationChain: (id: DelegationChain) => void;
  getWebauthnID: () => Promise<Ed25519KeyIdentity | null>;
}

const authContext = createContext<UseAuthContext>({
  setRootIdentity: noop,
  setWebauthnId: noop,
  setRootDelegationChain: noop,
  setSessionDelegationChain: noop,
  setSessionKey: noop,
  getWebauthnID: () => Promise.resolve(null),
});

function useProvideAuth(): UseAuthContext {
  const [webauthnId, setWebauthnId] = useState<Ed25519KeyIdentity>();
  const [rootIdentity, setRootIdentity] = useState<Bip39Ed25519KeyIdentity>();
  const [rootDelegationChain, setRootDelegationChain] = useState<DelegationChain>();
  const [sessionDelegationChain, setSessionDelegationChain] = useState<DelegationChain>();
  const [sessionKey, setSessionKey] = useState<PublicKey>();

  async function getWebauthnID(): Promise<Ed25519KeyIdentity> {
    const localStorageIdentity = await localforage.getItem<KeyPair>(LOCAL_STORAGE_WEBAUTHN_ID);
    if (localStorageIdentity) {
      const { publicKey, secretKey } = localStorageIdentity;
      return Ed25519KeyIdentity.fromKeyPair(publicKey.toDer(), secretKey);
    } else {
      // @TODO - use WebAuthIdentity.generate(); (TBD)
      const id = Ed25519KeyIdentity.generate();
      setWebauthnId(id);
      return id;
    }
  }

  return {
    webauthnId,
    rootIdentity,
    rootDelegationChain,
    sessionDelegationChain,
    getWebauthnID,
    sessionKey,
    setWebauthnId: id => setWebauthnId(id),
    setRootDelegationChain: chain => setRootDelegationChain(chain),
    setSessionDelegationChain: chain => setSessionDelegationChain(chain),
    setRootIdentity: id => setRootIdentity(id),
    setSessionKey: key => setSessionKey(key),
  };
}

export const useAuth = () => {
  return useContext(authContext);
};

export function ProvideAuth({ children }: ComponentProps<any>) {
  const auth = useProvideAuth();
  return <authContext.Provider value={auth}>{children}</authContext.Provider>;
}
