import 'fake-indexeddb/auto';
import { Actor, HttpAgent } from '@dfinity/agent';
import { AgentError } from '@dfinity/agent/lib/cjs/errors';
import { IDL } from '@dfinity/candid';
import { DelegationChain, Ed25519KeyIdentity } from '@dfinity/identity';
import { Principal } from '@dfinity/principal';
import { AuthClient, ERROR_USER_INTERRUPT, IdbStorage } from './index';
import {
  AuthClientStorage,
  KEY_STORAGE_DELEGATION,
  KEY_STORAGE_KEY,
  LocalStorage,
} from './storage';

/**
 * A class for mocking the IDP service.
 */
class IdpMock {
  constructor(
    private readonly eventListener: (event: unknown) => void,
    private readonly origin: string,
  ) {}

  ready(origin?: string) {
    this.send(
      {
        kind: 'authorize-ready',
      },
      origin,
    );
  }

  send(message: unknown, origin?: string) {
    this.eventListener({
      origin: origin ?? this.origin,
      data: message,
    });
  }
}

const { location, fetch } = window;

beforeEach(() => {
  jest.useFakeTimers();
});
afterEach(() => {
  delete (window as any).location;
  (window as any).location = location;
});

describe('Auth Client', () => {
  it('should initialize with an AnonymousIdentity', async () => {
    const test = await AuthClient.create();
    expect(await test.isAuthenticated()).toBe(false);
    expect(test.getIdentity().getPrincipal().isAnonymous()).toBe(true);
  });

  it('should initialize with a provided identity', async () => {
    const identity = Ed25519KeyIdentity.generate();
    const test = await AuthClient.create({
      identity,
    });
    expect(test.getIdentity().getPrincipal().isAnonymous()).toBe(false);
    expect(test.getIdentity()).toBe(identity);
  });

  it('should log users out', async () => {
    const test = await AuthClient.create();
    await test.logout();
    expect(await test.isAuthenticated()).toBe(false);
    expect(test.getIdentity().getPrincipal().isAnonymous()).toBe(true);
  });
  it('should not initialize an idleManager if the user is not logged in', async () => {
    const test = await AuthClient.create();
    expect(test.idleManager).not.toBeDefined();
  });
  it('should initialize an idleManager if an identity is passed', async () => {
    const test = await AuthClient.create({ identity: await Ed25519KeyIdentity.generate() });
    expect(test.idleManager).toBeDefined();
  });
  it('should be able to invalidate an identity after going idle', async () => {
    // setup actor
    delete (window as any).location;
    (window as any).location = {
      reload: jest.fn(),
      fetch,
      toString: jest.fn(() => 'http://localhost:4943'),
    };

    const identity = Ed25519KeyIdentity.generate();
    const mockFetch: jest.Mock = jest.fn();
    // http agent uses identity

    const canisterId = Principal.fromText('2chl6-4hpzw-vqaaa-aaaaa-c');
    const actorInterface = () => {
      return IDL.Service({
        greet: IDL.Func([IDL.Text], [IDL.Text]),
      });
    };

    // setup auth client
    const test = await AuthClient.create({
      identity,
      idleOptions: {
        idleTimeout: 1000,
      },
    });
    const httpAgent = new HttpAgent({ fetch: mockFetch });
    const actor = Actor.createActor(actorInterface, { canisterId, agent: httpAgent });

    test.idleManager?.registerCallback(() => {
      Actor.agentOf(actor)?.invalidateIdentity?.();
    });

    // wait for the idle timeout
    jest.advanceTimersByTime(1000);

    // check that the registered actor has been invalidated
    const expectedError =
      "This identity has expired due this application's security policy. Please refresh your authentication.";
    try {
      await actor.greet('hello');
    } catch (error) {
      expect((error as AgentError).message).toBe(expectedError);
    }
  });
  it('should log out after idle and reload the window by default', async () => {
    setup({
      onAuthRequest: () => {
        // Send a valid request.
        idpMock.send({
          kind: 'authorize-client-success',
          delegations: [
            {
              delegation: {
                pubkey: Uint8Array.from([]),
                expiration: BigInt(0),
              },
              signature: Uint8Array.from([]),
            },
          ],
          userPublicKey: Uint8Array.from([]),
        });
      },
    });
    delete (window as any).location;
    (window as any).location = { reload: jest.fn(), fetch };

    const storage: AuthClientStorage = {
      remove: jest.fn(),
      get: jest.fn(),
      set: jest.fn(),
    };

    // setup auth client
    const test = await AuthClient.create({
      storage,
      idleOptions: {
        idleTimeout: 1000,
      },
    });

    // Test login flow
    const onSuccess = jest.fn();
    test.login({ onSuccess });

    idpMock.ready();

    expect(storage.set).toBeCalled();
    expect(storage.remove).not.toBeCalled();

    // simulate user being inactive for 10 minutes
    jest.advanceTimersByTime(10 * 60 * 1000);

    // Storage should be cleared by default after logging out
    expect(storage.remove).toBeCalled();

    expect(window.location.reload).toBeCalled();
  });
  it('should not reload the page if the default callback is disabled', async () => {
    setup({
      onAuthRequest: () => {
        // Send a valid request.
        idpMock.send({
          kind: 'authorize-client-success',
          delegations: [
            {
              delegation: {
                pubkey: Uint8Array.from([]),
                expiration: BigInt(0),
              },
              signature: Uint8Array.from([]),
            },
          ],
          userPublicKey: Uint8Array.from([]),
        });
      },
    });
    delete (window as any).location;
    (window as any).location = { reload: jest.fn(), fetch };

    const storage: AuthClientStorage = {
      remove: jest.fn(),
      get: jest.fn(),
      set: jest.fn(),
    };

    const test = await AuthClient.create({
      storage,
      idleOptions: {
        idleTimeout: 1000,
        disableDefaultIdleCallback: true,
      },
    });

    // Test login flow
    await test.login();
    idpMock.ready();

    expect(storage.set).toBeCalled();
    expect(storage.remove).not.toBeCalled();

    // simulate user being inactive for 10 minutes
    jest.advanceTimersByTime(10 * 60 * 1000);

    // Storage should not be cleared
    expect(storage.remove).not.toBeCalled();
    // Page should not be reloaded
    expect(window.location.reload).not.toBeCalled();
  });
  it('should not reload the page if a callback is provided', async () => {
    setup({
      onAuthRequest: () => {
        // Send a valid request.
        idpMock.send({
          kind: 'authorize-client-success',
          delegations: [
            {
              delegation: {
                pubkey: Uint8Array.from([]),
                expiration: BigInt(0),
              },
              signature: Uint8Array.from([]),
            },
          ],
          userPublicKey: Uint8Array.from([]),
        });
      },
    });
    delete (window as any).location;
    (window as any).location = { reload: jest.fn(), fetch };
    const idleCb = jest.fn();
    const test = await AuthClient.create({
      idleOptions: {
        idleTimeout: 1000,
        onIdle: idleCb,
      },
    });

    test.login();
    idpMock.ready();

    // simulate user being inactive for 10 minutes
    jest.advanceTimersByTime(10 * 60 * 1000);

    expect(window.location.reload).not.toBeCalled();
    expect(idleCb).toBeCalled();
  });

  /**
   * This test reflects a feature that may be added at a future date,
   * allowing the authClient to register actors for automatic invalidation
   * and revalidation of identities
   */
  it.skip('should allow a registeredActor to get refreshed', async () => {
    setup({
      onAuthRequest: () => {
        // Send a valid request.
        idpMock.send({
          kind: 'authorize-client-success',
          delegations: [
            {
              delegation: {
                pubkey: Uint8Array.from([]),
                expiration: BigInt(0),
              },
              signature: Uint8Array.from([]),
            },
          ],
          userPublicKey: Uint8Array.from([]),
        });
      },
    });

    // setup actor
    const identity = Ed25519KeyIdentity.generate();
    const mockFetch: jest.Mock = jest.fn();
    // http agent uses identity

    const canisterId = Principal.fromText('2chl6-4hpzw-vqaaa-aaaaa-c');
    const actorInterface = () => {
      return IDL.Service({
        greet: IDL.Func([IDL.Text], [IDL.Text]),
      });
    };

    // setup auth client
    const test = await AuthClient.create({
      identity,
      idleOptions: {
        idleTimeout: 1000,
      },
    });
    const httpAgent = new HttpAgent({ fetch: mockFetch });
    const actor = Actor.createActor(actorInterface, { canisterId, agent: httpAgent });

    Actor.agentOf(actor)?.invalidateIdentity?.();

    // check that the registered actor has been invalidated
    const expectedError =
      "This identity has expired due this application's security policy. Please refresh your authentication.";
    try {
      await actor.greet('hello');
    } catch (error) {
      expect((error as AgentError).message).toBe(expectedError);
    }

    idpMock.ready();
    // check that the registered actor has been invalidated
    expect((Actor.agentOf(actor) as any)._identity).toBeTruthy();
  });
  it('should not set up an idle timer if the disable option is set', async () => {
    const idleFn = jest.fn();
    const test = await AuthClient.create({
      idleOptions: {
        idleTimeout: 1000,
        disableIdle: true,
      },
    });
    expect(idleFn).not.toHaveBeenCalled();
    expect(test.idleManager).toBeUndefined();
    // wait for default 30 minute idle timeout
    jest.advanceTimersByTime(30 * 60 * 1000);
    expect(idleFn).not.toHaveBeenCalled();
  });
  it('should not set up an idle timer if the client is not logged in', async () => {
    setup({
      onAuthRequest: () => {
        // Send a valid request.
        idpMock.send({
          kind: 'authorize-client-success',
          delegations: [
            {
              delegation: {
                pubkey: Uint8Array.from([]),
                expiration: BigInt(0),
              },
              signature: Uint8Array.from([]),
            },
          ],
          userPublicKey: Uint8Array.from([]),
        });
      },
    });
    delete (window as any).location;
    (window as any).location = { reload: jest.fn(), fetch };

    const storage: AuthClientStorage = {
      remove: jest.fn(),
      get: jest.fn(),
      set: jest.fn(),
    };

    const test = await AuthClient.create({
      storage,
      idleOptions: {
        idleTimeout: 1000,
      },
    });

    expect(storage.set).toBeCalled();
    expect(storage.remove).not.toBeCalled();

    // simulate user being inactive for 10 minutes
    jest.advanceTimersByTime(10 * 60 * 1000);

    // Storage should not be cleared
    expect(storage.remove).not.toBeCalled();
    // Page should not be reloaded
    expect(window.location.reload).not.toBeCalled();
  });
});

describe('IdbStorage', () => {
  it('should handle get and set', async () => {
    const storage = new IdbStorage();

    await storage.set('testKey', 'testValue');
    expect(await storage.get('testKey')).toBe('testValue');
  });
});

// A minimal interface of our interactions with the Window object of the IDP.
interface IdpWindow {
  postMessage(message: { kind: string }): void;
  close(): void;
  closed: boolean;
}

let idpWindow: IdpWindow;
let idpMock: IdpMock;
function setup(options?: { onAuthRequest?: () => void }) {
  // Set the event handler.
  global.addEventListener = jest.fn((_, callback) => {
    // eslint-disable-next-line
    // @ts-ignore
    idpMock = new IdpMock(callback, 'https://identity.ic0.app');
  });

  // Mock window.open and window.postMessage since we can't open windows here.
  // eslint-disable-next-line
  // @ts-ignore
  global.open = jest.fn(() => {
    const idpWin: IdpWindow = (idpWindow = {
      postMessage: jest.fn(message => {
        if (message.kind === 'authorize-client') {
          options?.onAuthRequest?.();
        }
      }),
      close: jest.fn(() => {
        idpWin.closed = true;
      }),
      closed: false,
    });
    return idpWin;
  });
}

describe('Auth Client login', () => {
  it('should open a window with the IDP url', async () => {
    setup();
    const client = await AuthClient.create();
    // Try without #authorize hash.
    await client.login({ identityProvider: 'http://localhost' });
    expect(global.open).toBeCalledWith('http://localhost/#authorize', 'idpWindow', undefined);

    // Try with #authorize hash.
    global.open = jest.fn();
    await client.login({ identityProvider: 'http://localhost#authorize' });
    expect(global.open).toBeCalledWith('http://localhost/#authorize', 'idpWindow', undefined);

    // Default url
    global.open = jest.fn();
    await client.login();
    expect(global.open).toBeCalledWith(
      'https://identity.ic0.app/#authorize',
      'idpWindow',
      undefined,
    );

    // Default custom window.open feature
    global.open = jest.fn();
    await client.login({
      windowOpenerFeatures: 'toolbar=0,location=0,menubar=0',
    });
    expect(global.open).toBeCalledWith(
      'https://identity.ic0.app/#authorize',
      'idpWindow',
      'toolbar=0,location=0,menubar=0',
    );
  });
  it('should login with a derivation origin', async () => {
    setup();
    const client = await AuthClient.create();
    // Try without #authorize hash.
    await client.login({
      identityProvider: 'http://localhost',
      derivationOrigin: 'http://localhost:1234',
    });

    idpMock.ready('http://localhost');

    const call = (idpWindow.postMessage as jest.Mock).mock.calls[0][0];
    expect(call['derivationOrigin']).toBe('http://localhost:1234');
  });

  it('should ignore authorize-ready events with bad origin', async () => {
    setup();
    const client = await AuthClient.create();
    await client.login();

    // Send an authorize-ready message with a bad origin. It should _not_ result
    // in a message sent back to the IDP.
    idpMock.ready('bad origin');

    // No response to the IDP canister.
    expect(idpWindow.postMessage).not.toBeCalled();
  });

  it('should respond to authorize-ready events with correct origin', async () => {
    setup();
    const client = await AuthClient.create();
    await client.login();

    // Send an authorize-ready message with the correct origin.
    idpMock.ready();

    // A response should be sent to the IDP.
    expect(idpWindow.postMessage).toBeCalled();
  });

  it('should call onError and close the IDP window on failure', async () => {
    setup({
      onAuthRequest: () => {
        // Send a failure message.
        idpMock.send({
          kind: 'authorize-client-failure',
          text: 'mock error message',
        });
      },
    });
    const client = await AuthClient.create();
    const failureFunc = jest.fn();
    await client.login({ onError: failureFunc });

    idpMock.ready();

    expect(failureFunc).toBeCalledWith('mock error message');
    expect(idpWindow.close).toBeCalled();
  });

  it('should call onError if recieved an invalid success message', async () => {
    setup({
      onAuthRequest: () => {
        idpMock.send({
          kind: 'authorize-client-success',
        });
      },
    });
    const client = await AuthClient.create();
    const failureFunc = jest.fn();
    await client.login({ onError: failureFunc });

    idpMock.ready();

    expect(failureFunc).toBeCalled();
    expect(idpWindow.close).toBeCalled();
    client.logout();
  });

  it('should call onError in an async pattern', async () => {
    setup({
      onAuthRequest: () => {
        idpMock.send({
          kind: 'authorize-client-success',
        });
      },
    });
    const client = await AuthClient.create();
    const cb = jest.fn();
    const failureFunc = async () => {
      await cb();
    };
    await client.login({ onError: failureFunc });

    idpMock.ready();

    expect(cb).toBeCalled();
    expect(idpWindow.close).toBeCalled();
  });

  it('should call onSuccess if recieved a valid success message', async () => {
    setup({
      onAuthRequest: () => {
        // Send a valid request.
        idpMock.send({
          kind: 'authorize-client-success',
          delegations: [
            {
              delegation: {
                pubkey: Uint8Array.from([]),
                expiration: BigInt(0),
              },
              signature: Uint8Array.from([]),
            },
          ],
          userPublicKey: Uint8Array.from([]),
        });
      },
    });

    const client = await AuthClient.create();
    const onSuccess = jest.fn();
    client.login({ onSuccess: onSuccess });

    idpMock.ready();

    expect(onSuccess).toBeCalled();
    expect(idpWindow.close).toBeCalled();
    await client.logout();
  });

  it('should call onError if the user closed the IDP window', async () => {
    setup();
    jest.useRealTimers();
    const client = await AuthClient.create({ idleOptions: { disableIdle: true } });

    await expect(
      new Promise<void>((onSuccess, onError) =>
        (async () => {
          await client.login({ onSuccess, onError });
          idpWindow.close();
        })(),
      ),
    ).rejects.toMatch(ERROR_USER_INTERRUPT);
  });
  it('should call an async onSuccess if recieved a valid success message', async () => {
    setup({
      onAuthRequest: () => {
        // Send a valid request.
        idpMock.send({
          kind: 'authorize-client-success',
          delegations: [
            {
              delegation: {
                pubkey: Uint8Array.from([]),
                expiration: BigInt(0),
              },
              signature: Uint8Array.from([]),
            },
          ],
          userPublicKey: Uint8Array.from([]),
        });
      },
    });

    const client = await AuthClient.create();
    const cb = jest.fn();
    const onSuccess = async () => {
      cb();
    };
    await client.login({ onSuccess: onSuccess });

    idpMock.ready();

    expect(cb).toBeCalled();
    expect(idpWindow.close).toBeCalled();
  });
});

describe('Migration from localstorage', () => {
  it('should proceed normally if no values are stored in localstorage', async () => {
    const storage: AuthClientStorage = {
      remove: jest.fn(),
      get: jest.fn(),
      set: jest.fn(),
    };

    await AuthClient.create({ storage });

    // Key is stored during creation when none is provided
    expect(storage.set as jest.Mock).toBeCalledTimes(1);
  });
  it('should not attempt to migrate if a delegation is already stored', async () => {
    const storage: AuthClientStorage = {
      remove: jest.fn(),
      get: jest.fn(async x => {
        if (x === KEY_STORAGE_DELEGATION) return 'test';
        if (x === KEY_STORAGE_KEY) return 'key';
        return null;
      }),
      set: jest.fn(),
    };

    await AuthClient.create({ storage });

    expect(storage.set as jest.Mock).toBeCalledTimes(1);
  });
  it('should migrate storage from localstorage', async () => {
    const localStorage = new LocalStorage();
    const storage: AuthClientStorage = {
      remove: jest.fn(),
      get: jest.fn(),
      set: jest.fn(),
    };

    await localStorage.set(KEY_STORAGE_DELEGATION, 'test');
    await localStorage.set(KEY_STORAGE_KEY, 'key');

    await AuthClient.create({ storage });

    expect(storage.set as jest.Mock).toBeCalledTimes(3);
  });
});

describe('Migration from Ed25519Key', () => {
  const testSecrets = [
    '302a300506032b6570032100d1fa89134802051c8b5d4e53c08b87381b87097bca4c4f348611eb8ce6c91809',
    '4bbff6b476463558d7be318aa342d1a97778d70833038680187950e9e02486c0d1fa89134802051c8b5d4e53c08b87381b87097bca4c4f348611eb8ce6c91809',
  ];
  it('should continue using an existing Ed25519Key and delegation', async () => {
    // set the jest timer to a fixed value
    jest.setSystemTime(new Date('2020-01-01T00:00:00.000Z'));

    // two days from now
    const expiration = new Date('2020-01-03T00:00:00.000Z');

    const key = await Ed25519KeyIdentity.fromJSON(JSON.stringify(testSecrets));
    const chain = DelegationChain.create(key, key.getPublicKey(), expiration);
    const storage: AuthClientStorage = {
      remove: jest.fn(),
      get: jest.fn(async x => {
        if (x === KEY_STORAGE_DELEGATION) return JSON.stringify((await chain).toJSON());
        if (x === KEY_STORAGE_KEY) return JSON.stringify(testSecrets);
        return null;
      }),
      set: jest.fn(),
    };

    const client = await AuthClient.create({ storage });

    const identity = await client.getIdentity();
    expect(identity).toMatchSnapshot();
  });
  it('should continue using an existing Ed25519Key with no delegation', async () => {
    // set the jest timer to a fixed value
    jest.setSystemTime(new Date('2020-01-01T00:00:00.000Z'));

    const storage: AuthClientStorage = {
      remove: jest.fn(),
      get: jest.fn(async x => {
        if (x === KEY_STORAGE_KEY) return JSON.stringify(testSecrets);
        return null;
      }),
      set: jest.fn(),
    };

    const client = await AuthClient.create({ storage });

    const identity = await client.getIdentity();
    expect(identity.getPrincipal().isAnonymous()).toBe(true);
  });
  it('should continue using an existing Ed25519Key with an expired delegation', async () => {
    // set the jest timer to a fixed value
    jest.setSystemTime(new Date('2020-01-01T00:00:00.000Z'));

    // two days ago
    const expiration = new Date('2019-12-30T00:00:00.000Z');

    const key = await Ed25519KeyIdentity.fromJSON(JSON.stringify(testSecrets));
    const chain = DelegationChain.create(key, key.getPublicKey(), expiration);
    const fakeStore: Record<any, any> = {};
    fakeStore[KEY_STORAGE_DELEGATION] = JSON.stringify((await chain).toJSON());
    fakeStore[KEY_STORAGE_KEY] = JSON.stringify(testSecrets);

    const storage: AuthClientStorage = {
      remove: jest.fn(async x => {
        delete fakeStore[x];
      }),
      get: jest.fn(async x => {
        return fakeStore[x] ?? null;
      }),
      set: jest.fn(),
    };

    const client = await AuthClient.create({ storage });

    const identity = await client.getIdentity();
    expect(identity.getPrincipal().isAnonymous()).toBe(true);

    // expect the delegation to be removed
    expect(storage.remove as jest.Mock).toBeCalledTimes(3);
    expect(fakeStore).toMatchInlineSnapshot(`Object {}`);
  });
  it('should generate and store a ECDSAKey if no key is stored', async () => {
    const fakeStore: Record<any, any> = {};
    const storage: AuthClientStorage = {
      remove: jest.fn(),
      get: jest.fn(),
      set: jest.fn(async (x, y) => {
        fakeStore[x] = y;
      }),
    };
    const client = await AuthClient.create({ storage });

    // It should have stored a cryptoKey
    expect(Object.keys(fakeStore[KEY_STORAGE_KEY])).toMatchInlineSnapshot(`
      Array [
        "privateKey",
        "publicKey",
      ]
    `);
  });
  it('should generate and store a ECDSAKey if no key is stored and keyType is set to Ed25519', async () => {
    const fakeStore: Record<any, any> = {};
    const storage: AuthClientStorage = {
      remove: jest.fn(),
      get: jest.fn(),
      set: jest.fn(async (x, y) => {
        fakeStore[x] = y;
      }),
    };

    // mock ED25519 generate method
    const generate = jest.spyOn(Ed25519KeyIdentity, 'generate');
    generate.mockImplementation(async () => {
      const key = await Ed25519KeyIdentity.fromJSON(JSON.stringify(testSecrets));
      return key;
    });

    const client1 = await AuthClient.create({ storage, keyType: 'Ed25519' });

    const identity1 = await client1.getIdentity();

    const client2 = await AuthClient.create({ storage, keyType: 'Ed25519' });

    const identity2 = await client2.getIdentity();

    // It should have stored a cryptoKey
    expect(fakeStore[KEY_STORAGE_KEY]).toMatchSnapshot();
    expect(identity1.getPrincipal().toString()).toEqual(identity2.getPrincipal().toString());
  });
});
