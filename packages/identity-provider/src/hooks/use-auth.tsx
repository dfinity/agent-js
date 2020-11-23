import { Identity, KeyPair } from '@dfinity/agent';
import { Bip39Ed25519KeyIdentity, Ed25519KeyIdentity } from '@dfinity/authentication';
import localforage from 'localforage';
import React, { ComponentProps, createContext, useContext, useEffect, useState } from 'react';
import { appendTokenParameter } from '../../src/identity-provider';
import {
  LOCAL_STORAGE_MASTER_ID,
  LOCAL_STORAGE_REDIRECT_URI,
  LOCAL_STORAGE_WEBAUTHN_ID,
} from '../utils/constants';

interface UseAuthContext {
  webauthnId?: Ed25519KeyIdentity;
  masterId?: Bip39Ed25519KeyIdentity;
  setWebauthnId: (id: Ed25519KeyIdentity) => void;
  setMasterId: (identity: Bip39Ed25519KeyIdentity) => void;
  getWebauthnID: () => Promise<Ed25519KeyIdentity | null>;
  createDelegation: () => any;
  setRedirectURI: (uri: string) => any;
}

const authContext = createContext<UseAuthContext | null>(null);

function useProvideAuth(): UseAuthContext {
  const [webauthnId, setWebauthnId] = useState<Ed25519KeyIdentity>();
  const [masterId, setMasterId] = useState<Bip39Ed25519KeyIdentity>();
  const [delegation, setDelegation] = useState<any | null>(null);
  const [redirectURI, setRedirectURI] = useState<string | null>(null);

  // every time we get a new masterId, put it in localstorage
  useEffect(() => {
    if (masterId !== undefined && history !== undefined) {
      localforage.setItem<Bip39Ed25519KeyIdentity>(LOCAL_STORAGE_MASTER_ID, masterId);
    }
  }, [masterId]);

  // every time we get a new webauthnId, put it in localstorage
  useEffect(() => {
    if (webauthnId !== undefined) {
      localforage.setItem(LOCAL_STORAGE_WEBAUTHN_ID, webauthnId);
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
    const lsValue = await localforage.getItem<Ed25519KeyIdentity>(LOCAL_STORAGE_WEBAUTHN_ID);
    if (lsValue) {
      return lsValue;
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
  ): string {
    // delegation.toCBOR().toBase64Url()
    return 'lolok';
  }

  return {
    setRedirectURI: uri => setRedirectURI(uri),
    webauthnId,
    masterId,
    getWebauthnID,
    setWebauthnId: id => setWebauthnId(id),
    setMasterId: id => setMasterId(id),
    createDelegation: () => {
      // delegation.toCBOR().toBase64Url()
      if (masterId) {
        const keyPair: KeyPair = {
          // @ts-ignore
          publicKey: masterId._publicKey,
          // @ts-ignore
          secretKey: masterId._privateKey,
        };
        setDelegation(createDelegation(keyPair, [masterId]));
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
