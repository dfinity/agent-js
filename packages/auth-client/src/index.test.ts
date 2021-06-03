import { AuthClient } from './index';

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

  it('should log users out', async () => {
    const test = await AuthClient.create();
    await test.logout();
    expect(await test.isAuthenticated()).toBe(false);
    expect(test.getIdentity().getPrincipal().isAnonymous()).toBe(true);
  });
});

// A minimal interface of our interactions with the Window object of the IDP.
interface IdpWindow {
  postMessage(message: { kind: string }): void;
  close(): void;
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
    idpWindow = {
      postMessage: jest.fn(message => {
        if (message.kind === 'authorize-client') {
          options?.onAuthRequest?.();
        }
      }),
      close: jest.fn(),
    };
    return idpWindow;
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
  });
});
