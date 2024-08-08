import * as React from 'react';
import {
  AuthClient,
  AuthClientCreateOptions,
  AuthClientLoginOptions,
  InternetIdentityAuthResponseSuccess,
} from '@dfinity/auth-client';
import {
  type Identity,
  type Agent,
  type HttpAgentOptions,
  type ActorConfig,
  HttpAgent,
  Actor,
  ActorSubclass,
} from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';
import { Principal } from '@dfinity/principal';

export interface CreateActorOptions {
  /**
   * @see {@link Agent}
   */
  agent?: Agent;
  /**
   * @see {@link HttpAgentOptions}
   */
  agentOptions?: HttpAgentOptions;
  /**
   * @see {@link ActorConfig}
   */
  actorOptions?: ActorConfig;

  idlFactory: IDL.InterfaceFactory;

  canisterId: Principal | string;
}

/**
 * Options for the useAuthClient hook
 */
export type UseAuthClientOptions = {
  createSync?: boolean;
  /**
   * Options passed during the creation of the auth client
   */
  createOptions?: AuthClientCreateOptions;
  /**
   * Options passed during the login of the auth client
   */
  loginOptions?: AuthClientLoginOptions;
  /**
   * Options to create an actor using the auth client identity
   */
  actorOptions?: CreateActorOptions | Record<string, CreateActorOptions>;
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
  const [actor, setActor] = React.useState<ActorSubclass | null>();
  const [actors, setActors] = React.useState<Record<string, ActorSubclass>>({});
  const [isAuthenticated, setIsAuthenticated] = React.useState<boolean>(false);

  // load the auth client on mount
  React.useEffect(() => {
    AuthClient.create({
      ...options?.createOptions,
      idleOptions: {
        ...options?.createOptions?.idleOptions,
        onIdle:
          options?.createOptions?.idleOptions?.onIdle ??
          (() => {
            logout();
          }),
      },
    }).then(async client => {
      setAuthClient(client);
      setIdentity(client.getIdentity());
      setIsAuthenticated(await client.isAuthenticated());
    });
  }, []);

  React.useEffect(() => {
    if (identity && options?.actorOptions) {
      // if the options is for a single actor, it will have a canisterId
      if ('canisterId' in options.actorOptions) {
        const createActorOptions = options.actorOptions as CreateActorOptions;
        createActor({
          ...createActorOptions,
          agentOptions: { ...createActorOptions?.agentOptions, identity },
        }).then(actor => {
          // set the actor service

          setActor(actor);
        });
      } else {
        // if the options is for multiple actors, it will have a key value pair of an identifier and CreateActorOptions
        const actorOptions = options.actorOptions as Record<string, CreateActorOptions>;
        const actorPromises = Object.entries(actorOptions).map(
          async ([canisterId, createActorOptions]) => {
            const actor = await createActor({
              ...createActorOptions,
              agentOptions: { ...createActorOptions?.agentOptions, identity },
            });
            return [canisterId, actor];
          },
        );
        Promise.all(actorPromises).then(actors => {
          setActors(Object.fromEntries(actors));
        });
      }
    }
  }, [identity]);

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
            }
            resolve(successResponse);
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
      if (options?.actorOptions) {
        if ('canisterId' in options.actorOptions) {
          setActor(await createActor(options.actorOptions as CreateActorOptions));
        } else {
          const actorOptions = options.actorOptions as Record<string, CreateActorOptions>;
          const actorPromises = Object.entries(actorOptions).map(
            async ([canisterId, createActorOptions]) => {
              // Initialize with anonymous identity
              const actor = await createActor(createActorOptions);
              return [canisterId, actor];
            },
          );
          Promise.all(actorPromises).then(actors => {
            setActors(Object.fromEntries(actors));
          });
        }
      } else {
        setActor(null);
        setActors({});
      }
    }
  }

  return {
    actor,
    actors,
    authClient,
    identity,
    isAuthenticated,
    login,
    logout,
  };
}

const createActor = async (options: CreateActorOptions) => {
  options;
  const agent = options.agent || (await HttpAgent.create({ ...options.agentOptions }));

  if (options.agent && options.agentOptions) {
    console.warn(
      'Detected both agent and agentOptions passed to createActor. Ignoring agentOptions and proceeding with the provided agent.',
    );
  }

  // Fetch root key for certificate validation during development
  if (process.env.DFX_NETWORK !== 'ic') {
    agent.fetchRootKey().catch(err => {
      console.warn('Unable to fetch root key. Check to ensure that your local replica is running');
      console.error(err);
    });
  }

  // Creates an actor with using the candid interface and the HttpAgent
  return Actor.createActor(options.idlFactory, {
    agent,
    canisterId: options.canisterId,
    ...options.actorOptions,
  });
};
