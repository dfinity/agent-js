import { Actor, HttpAgent } from '@dfinity/agent';
import { AgentError } from '@dfinity/agent/lib/cjs/errors';
import { IDL } from '@dfinity/candid';
import { Ed25519KeyIdentity } from '@dfinity/identity';
import { Principal } from '@dfinity/principal';
import { AuthClient, AuthClientStorage, ERROR_USER_INTERRUPT } from './index';

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
  it('should initialize an idleManager', async () => {
    const test = await AuthClient.create();
    expect(test.idleManager).toBeDefined();
  });
  it('should be able to invalidate an identity after going idle', async () => {
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
    const mockFetch: jest.Mock = jest.fn();

    const canisterId = Principal.fromText('2chl6-4hpzw-vqaaa-aaaaa-c');
    const actorInterface = () => {
      return IDL.Service({
        greet: IDL.Func([IDL.Text], [IDL.Text]),
      });
    };

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
    await test.login({ identityProvider: 'http://localhost' });

    expect(storage.set).toBeCalled();
    expect(storage.remove).not.toBeCalled();

    const httpAgent = new HttpAgent({ fetch: mockFetch, host: 'http://127.0.0.1:8000' });
    const actor = Actor.createActor(actorInterface, { canisterId, agent: httpAgent });

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
    await test.login({ identityProvider: 'http://localhost' });

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
    delete (window as any).location;
    (window as any).location = { reload: jest.fn(), fetch };
    const idleCb = jest.fn();
    const test = await AuthClient.create({
      idleOptions: {
        idleTimeout: 1000,
        onIdle: idleCb,
      },
    });

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
    await client.login({ onSuccess: onSuccess });

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
