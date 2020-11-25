import { Identity, KeyPair } from '@dfinity/agent';
import {
  Bip39Ed25519KeyIdentity,
  DelegationChain,
  Ed25519KeyIdentity,
  Ed25519PublicKey,
} from '@dfinity/authentication';
import localforage from 'localforage';
import React, { ComponentProps, createContext, useContext, useEffect, useState } from 'react';
import { LOCAL_STORAGE_ROOT_CREDENTIAL, LOCAL_STORAGE_WEBAUTHN_ID } from '../utils/constants';

export interface UseAuthContext {
  rootIdentity?: Bip39Ed25519KeyIdentity;
  rootDelegationChain?: DelegationChain;
  webauthnId?: Ed25519KeyIdentity;
  setRootIdentity: (identity: Bip39Ed25519KeyIdentity) => void;
  setWebauthnId: (id: Ed25519KeyIdentity) => void;
  setRootDelegationChain: (id: DelegationChain) => void;
  getWebauthnID: () => Promise<Ed25519KeyIdentity | null>;
}

const authContext = createContext<UseAuthContext | null>(null);

function useProvideAuth(): UseAuthContext {
  const [webauthnId, setWebauthnId] = useState<Ed25519KeyIdentity>();
  const [rootIdentity, setRootIdentity] = useState<Bip39Ed25519KeyIdentity>();
  const [rootDelegationChain, setRootDelegationChain] = useState<DelegationChain>();

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
    getWebauthnID,
    setWebauthnId: id => setWebauthnId(id),
    setRootDelegationChain: chain => setRootDelegationChain(chain),
    setRootIdentity: id => setRootIdentity(id),
  };
}

export const useAuth = () => {
  return useContext(authContext);
};

export function ProvideAuth({ children }: ComponentProps<any>) {
  const auth = useProvideAuth();
  return <authContext.Provider value={auth}>{children}</authContext.Provider>;
}
