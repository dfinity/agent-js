import * as React from 'react';
import { AuthClient, } from '@dfinity/auth-client';
/**
 * React hook to set up the Internet Computer auth client
 * @param {UseAuthClientOptions} options configuration for the hook
 * @see {@link UseAuthClientOptions}
 * @param {AuthClientCreateOptions} options.createOptions  - options passed during the creation of the auth client
 * @param {AuthClientLoginOptions} options.loginOptions -
 */
export function useAuthClient(options) {
    const [authClient, setAuthClient] = React.useState(null);
    const [identity, setIdentity] = React.useState(null);
    const [isAuthenticated, setIsAuthenticated] = React.useState(false);
    // load the auth client on mount
    React.useEffect(() => {
        AuthClient.create(options?.createOptions).then(async (client) => {
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
    function login() {
        return new Promise((resolve, reject) => {
            if (authClient) {
                const callback = options?.loginOptions?.onSuccess;
                const errorCb = options?.loginOptions?.onError;
                authClient.login({
                    ...options?.loginOptions,
                    onSuccess: (successResponse) => {
                        if (successResponse !== undefined) {
                            callback?.(successResponse);
                        }
                        else {
                            callback?.();
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
