import { Identity, KeyPair } from '@dfinity/agent';
import {
  Bip39Ed25519KeyIdentity,
  Ed25519KeyIdentity,
  Ed25519PublicKey,
} from '@dfinity/authentication';
import localforage from 'localforage';
import React, { ComponentProps, createContext, useContext, useEffect, useState } from 'react';
import { appendTokenParameter } from '../../src/identity-provider';
import {
  LOCAL_STORAGE_ROOT_ID,
  LOCAL_STORAGE_REDIRECT_URI,
  LOCAL_STORAGE_WEBAUTHN_ID,
} from '../utils/constants';

interface UseAuthContext {
  webauthnId?: Ed25519KeyIdentity;
  rootId?: Bip39Ed25519KeyIdentity;
  setWebauthnId: (id: Ed25519KeyIdentity) => void;
  setRootId: (identity: Bip39Ed25519KeyIdentity) => void;
  getWebauthnID: () => Promise<Ed25519KeyIdentity | null>;
  createDelegation: () => any;
  setRedirectURI: (uri: string) => any;
}

const authContext = createContext<UseAuthContext | null>(null);

function useProvideAuth(): UseAuthContext {
  const [webauthnId, setWebauthnId] = useState<Ed25519KeyIdentity>();
  const [rootIdentity, setRootIdentity] = useState<Bip39Ed25519KeyIdentity>();
  const [webauthnKeys, setWebauthnKeys] = useState<KeyPair>();
  const [rootKeys, setRootKeys] = useState<KeyPair>();
  const [delegation, setDelegation] = useState<Ed25519PublicKey | null>(null);
  const [redirectURI, setRedirectURI] = useState<string | null>(null);

  // every time we get a new root ID, put it in localstorage
  useEffect(() => {
    if (rootIdentity !== undefined && history !== undefined) {
      const rootKeyPair = rootIdentity.getKeyPair();
      if (rootKeyPair) {
        setRootKeys(rootKeyPair);
        localforage.setItem<KeyPair>(LOCAL_STORAGE_ROOT_ID, rootKeyPair);
      }
    }
  }, [rootIdentity]);

  // every time we get a new webauthnId, put it in localstorage
  useEffect(() => {
    if (webauthnId !== undefined) {
      localforage.setItem<KeyPair>(LOCAL_STORAGE_WEBAUTHN_ID, webauthnId.getKeyPair());
    }
  }, [webauthnId]);

  // if we get a new delegation, redirect to the URL?
  useEffect(() => {
    if (delegation !== null && redirectURI !== null) {
      const url = appendTokenParameter(redirectURI, delegation);
      window.location.assign(url.toString());
    }
  }, [delegation]);

  async function getWebauthnID(): Promise<Ed25519KeyIdentity> {
    const localSTorageIdentity = await localforage.getItem<KeyPair>(LOCAL_STORAGE_WEBAUTHN_ID);
    if (localSTorageIdentity) {
      const { publicKey, secretKey } = localSTorageIdentity;
      return Ed25519KeyIdentity.fromKeyPair(publicKey.toDer(), secretKey);
    } else {
      // @TODO - use WebAuthIdentity.generate(); (TBD)
      const id = Ed25519KeyIdentity.generate();
      setWebauthnId(id);
      return id;
    }
  }

  function createDelegation(
    sessionKey: KeyPair,
    ids: Identity[],
    config: { expiration: number } = { expiration: 15 * 60 },
  ): Ed25519PublicKey {
    // delegation.toCBOR().toBase64Url()
    return Ed25519PublicKey.fromDer(sessionKey.publicKey.toDer());
  }

  return {
    setRedirectURI: uri => setRedirectURI(uri),
    webauthnId,
    rootId: rootIdentity,
    getWebauthnID,
    setWebauthnId: id => setWebauthnId(id),
    setRootId: id => setRootIdentity(id),
    createDelegation: () => {
      if (rootIdentity && rootKeys) {
        const keyPair: KeyPair = {
          publicKey: rootKeys.publicKey,
          secretKey: rootKeys.secretKey,
        };
        setDelegation(createDelegation(keyPair, [rootIdentity]));
      }
    },
  };
}

export const useAuth = () => {
  return useContext(authContext);
};

export function ProvideAuth({ children }: ComponentProps<any>) {
  const auth = useProvideAuth();
  return <authContext.Provider value={auth}>{children}</authContext.Provider>;
}
