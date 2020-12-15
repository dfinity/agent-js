import { KeyPair, PublicKey } from '@dfinity/agent';
import { DelegationChain, Ed25519KeyIdentity } from '@dfinity/authentication';
import localforage from 'localforage';
import React, { ComponentProps, createContext, useContext, useEffect, useState } from 'react';
import { AuthStore } from 'src/authorization/authStorage';
import { LOCAL_STORAGE_WEBAUTHN_ID } from '../utils/constants';

const noop = () => {};

export interface UseAuthContext {
  rootIdentity?: Ed25519KeyIdentity;
  deviceIdentity?: Ed25519KeyIdentity;
  sessionKey?: PublicKey;
  rootDelegationChain?: DelegationChain;
  deviceDelegationChain?: DelegationChain;
  sessionDelegationChain?: DelegationChain;
  webauthnId?: Ed25519KeyIdentity;
  setRootIdentity: (identity: Ed25519KeyIdentity) => void;
  setDeviceIdentity: (identity: Ed25519KeyIdentity) => void;
  setSessionKey: (key: PublicKey) => void;
  setWebauthnId: (id: Ed25519KeyIdentity) => void;
  setRootDelegationChain: (id: DelegationChain) => void;
  setDeviceDelegationChain: (id: DelegationChain) => void;
  setSessionDelegationChain: (id: DelegationChain) => void;
  getWebauthnID: () => Promise<Ed25519KeyIdentity | null>;
}

const authContext = createContext<UseAuthContext>({
  setRootIdentity: noop,
  setWebauthnId: noop,
  setRootDelegationChain: noop,
  setDeviceDelegationChain: noop,
  setDeviceIdentity: noop,
  setSessionDelegationChain: noop,
  setSessionKey: noop,
  getWebauthnID: () => Promise.resolve(null),
});

function useProvideAuth(): UseAuthContext {
  const [webauthnId, setWebauthnId] = useState<Ed25519KeyIdentity>();
  const [rootIdentity, setRootIdentity] = useState<Ed25519KeyIdentity>();
  const [deviceIdentity, setDeviceIdentity] = useState<Ed25519KeyIdentity>();
  const [rootDelegationChain, setRootDelegationChain] = useState<DelegationChain>();
  const [deviceDelegationChain, setDeviceDelegationChain] = useState<DelegationChain>();
  const [sessionDelegationChain, setSessionDelegationChain] = useState<DelegationChain>();
  const [sessionKey, setSessionKey] = useState<PublicKey>();

  const authStore = new AuthStore(localforage);

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

  // this should only be run once (on initialization of the hook)
  useEffect(() => {
    localforage.ready(async () => {
      const maybeIdentity = await authStore.getRootIdentity();
      console.debug('use-auth first boot rootIdentity from authStore', { maybeIdentity })
      if (maybeIdentity) {
        setRootIdentity(maybeIdentity);
      }
    });
  }, []);

  useEffect(() => {
    if (rootIdentity) {
      authStore.saveRootIdentity(rootIdentity);
    }
  }, [rootIdentity]);

  return {
    webauthnId,
    rootIdentity,
    deviceIdentity,
    deviceDelegationChain,
    rootDelegationChain,
    sessionDelegationChain,
    getWebauthnID,
    sessionKey,
    setWebauthnId: id => setWebauthnId(id),
    setRootDelegationChain: chain => setRootDelegationChain(chain),
    setDeviceDelegationChain: chain => setDeviceDelegationChain(chain),
    setSessionDelegationChain: chain => setSessionDelegationChain(chain),
    setRootIdentity: id => setRootIdentity(id),
    setDeviceIdentity: id => setDeviceIdentity(id),
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
