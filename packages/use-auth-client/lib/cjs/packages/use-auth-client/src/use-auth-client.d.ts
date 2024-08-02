import { AuthClient, AuthClientCreateOptions, AuthClientLoginOptions, InternetIdentityAuthResponseSuccess } from '@dfinity/auth-client';
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
export declare function useAuthClient(options?: UseAuthClientOptions): {
    authClient: AuthClient;
    identity: Identity;
    isAuthenticated: boolean;
    login: () => Promise<InternetIdentityAuthResponseSuccess | void>;
    logout: () => Promise<void>;
};
