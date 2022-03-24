import { Actor, HttpAgent } from '@dfinity/agent';
import { IDL } from '@dfinity/candid';
import { Ed25519KeyIdentity } from '@dfinity/identity';
import { Principal } from '@dfinity/principal';
import { AuthClient, ERROR_USER_INTERRUPT } from './index';

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
    jest.useFakeTimers();
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

    // idle function invalidates actor
    const idleFn = jest.fn(() => {
      Actor.agentOf(actor).invalidateIdentity();
    });

    // setup auth client
    const test = await AuthClient.create({
      identity,
      idleOptions: {
        idleTimeout: 1000,
        onIdle: idleFn,
      },
    });
    const httpAgent = new HttpAgent({ fetch: mockFetch, identity: await test.getIdentity() });
    const actor = Actor.createActor(actorInterface, { canisterId, agent: httpAgent });
    expect(idleFn).not.toHaveBeenCalled();
    // wait for the idle timeout
    jest.advanceTimersByTime(1000);
    expect(idleFn).toHaveBeenCalled();
    const expectedError =
      "This identity has expired due this application's security policy. Please refresh your authentication.";
    try {
      await actor.greet('hello');
    } catch (error) {
      expect(error.message).toBe(expectedError);
    }
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
    expect(global.open).toBeCalledWith('http://localhost/#authorize', 'idpWindow');

    // Try with #authorize hash.
    global.open = jest.fn();
    await client.login({ identityProvider: 'http://localhost#authorize' });
    expect(global.open).toBeCalledWith('http://localhost/#authorize', 'idpWindow');

    // Default url
    global.open = jest.fn();
    await client.login();
    expect(global.open).toBeCalledWith('https://identity.ic0.app/#authorize', 'idpWindow');
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
