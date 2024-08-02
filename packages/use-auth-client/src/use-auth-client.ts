import * as React from 'react';
import {
  AuthClient,
  AuthClientCreateOptions,
  AuthClientLoginOptions,
  InternetIdentityAuthResponseSuccess,
} from '@dfinity/auth-client';
import { Identity } from '@dfinity/agent';

/**
 * Options for the useAuthClient hook
 */
export type UseAuthClientOptions = {
  /**
   * Options passed during the creation of the auth client
   */
  createOptions?: AuthClientCreateOptions;
  /**
   * Options passed during the login of the auth client
   */
  loginOptions?: AuthClientLoginOptions;
};

/**
 * React hook to set up the Internet Computer auth client
 * @param {UseAuthClientOptions} options configuration for the hook
 * @see {@link UseAuthClientOptions}
 * @param {AuthClientCreateOptions} options.createOptions  - options passed during the creation of the auth client
 * @param {AuthClientLoginOptions} options.loginOptions -
 */
export function useAuthClient(options?: UseAuthClientOptions) {
  const [authClient, setAuthClient] = React.useState<AuthClient | null>(null);
  const [identity, setIdentity] = React.useState<Identity | null>(null);
  const [isAuthenticated, setIsAuthenticated] = React.useState<boolean>(false);

  // load the auth client on mount
  React.useEffect(() => {
    AuthClient.create(options?.createOptions).then(async client => {
      setAuthClient(client);
      setIdentity(client.getIdentity());
      setIsAuthenticated(await client.isAuthenticated());
    });
  }, []);

  /**
   * Login through your configured identity provider
   * Wraps the onSuccess and onError callbacks with promises for convenience
   * @returns {Promise<InternetIdentityAuthResponseSuccess | void>} - Returns a promise that resolves to the response from the identity provider
   */
  function login(): Promise<InternetIdentityAuthResponseSuccess | void> {
    return new Promise((resolve, reject) => {
      if (authClient) {
        const callback = options?.loginOptions?.onSuccess;
        const errorCb = options?.loginOptions?.onError;
        authClient.login({
          ...options?.loginOptions,
          onSuccess: (successResponse?: InternetIdentityAuthResponseSuccess) => {
            setIsAuthenticated(true);
            setIdentity(authClient.getIdentity());
            if (successResponse !== undefined) {
              callback?.(successResponse);
            } else {
              (callback as () => void)?.();
              resolve(successResponse);
            }
          },
          onError: error => {
            errorCb?.(error);
            reject(error);
          },
        });
      }
    });
  }

  async function logout() {
    if (authClient) {
      setIsAuthenticated(false);
      setIdentity(null);
      await authClient.logout();
    }
  }

  return {
    authClient,
    identity,
    isAuthenticated,
    login,
    logout,
  };
}
