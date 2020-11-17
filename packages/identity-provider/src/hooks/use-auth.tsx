import localforage from 'localforage';
import React, { ComponentProps, createContext, useContext, useEffect, useState } from 'react';
import { LOCAL_STORAGE_WEBAUTHN_ID } from '../utils/constants';

interface UseAuthContext {
  webauthnId?: Uint8Array;
  clearSession: (...props: any[]) => Promise<void>;
  createSession: (...props: any[]) => Promise<void>;
}

const noop = () => Promise.reject('did not implement');

const authContext = createContext<UseAuthContext>({ clearSession: noop, createSession: noop });

function useProvideAuth(): UseAuthContext {
  const [webauthnId, setWebauthnId] = useState<Uint8Array>();

  useEffect(() => {
    localforage
      .getItem<Uint8Array>(LOCAL_STORAGE_WEBAUTHN_ID)
      .then(res => {
        if (res) {
          setWebauthnId(res);
        } else {
          // do nothing
        }
      })
      .catch(err => {
        // do nothing
      });
  }, []);

  function createSession() {
    return Promise.resolve();
  }

  function clearSession() {
    return Promise.resolve();
  }

  return {
    webauthnId,
    clearSession,
    createSession,
  };
}

export const useAuth = () => {
  return useContext(authContext);
};

export function ProvideAuth({ children }: ComponentProps<any>) {
  const auth = useProvideAuth();
  return <authContext.Provider value={auth}>{children}</authContext.Provider>;
}
