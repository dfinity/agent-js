import { Authenticator, DefaultAuthenticatorTransport } from './Authenticator';
import { IdentityChangedEventIdentifier, IdentityChangedEvent } from '../id-dom-events';
import { unsafeTemporaryIdentityProvider } from '../idp-agent';
import { Ed25519KeyIdentity } from '../identity/ed25519';
import { createIdentityDescriptor } from '@dfinity/agent';

describe('@dfinity/authentication Authenticator', () => {
  it('has useSession(useSessionCommand)', async () => {
    const authenticator = new Authenticator();
    expect(typeof authenticator.useSession).toEqual('function');
  });
  it('useSession(command) can be called with missing comand.authenticationResponse', async () => {
    /*
    This generally makes it way easier to document this API, even though a
    session without an authenticationResponse isn't useful
    to this library at the time of this writing.
    */
    const authenticator = new Authenticator();
    async function useSessionWithoutAuthenticationResponse() {
      await authenticator.useSession({
        identity: {
          async sign(challenge) {
            return challenge; /* this wont work */
          },
        },
      });
    }
    expect(useSessionWithoutAuthenticationResponse()).resolves.not.toThrow();
  });
  it('implements EventTarget https://developer.mozilla.org/en-US/docs/Web/API/EventTarget', () => {
    expect(typeof new Authenticator().addEventListener).toEqual('function');
    expect(typeof new Authenticator().removeEventListener).toEqual('function');
  });
  // re-enable when removeListener can clean up properly in nodejs,
  // otherwise IdentityRequestedEvent MessageChannel is never closed
  it('can addEventListener("event", listener)', async () => {
    const eventTarget = document.createElement('div');
    const authenticator = new Authenticator({
      identityProvider: unsafeTemporaryIdentityProvider,
      events: eventTarget,
      transport: DefaultAuthenticatorTransport(eventTarget),
    });
    function createNewIdentity() {
      const identity = Ed25519KeyIdentity.generate(crypto.getRandomValues(new Uint8Array(32)));
      return identity;
    }
    const identity2 = createNewIdentity();
    // Will need to store this function ref to be able to pass it to removeListener
    const firstListener = jest.fn();
    async function testAddEventListener() {
      await new Promise(resolve => {
        authenticator.addEventListener(IdentityChangedEventIdentifier, firstListener);

        eventTarget.dispatchEvent(
          IdentityChangedEvent({ identity: createIdentityDescriptor(identity2) }),
        );
      });
    }

    testAddEventListener();
    expect(firstListener).toBeCalledTimes(1);

    // Now removeEventListener and ensure our first listener isn't called
    const listenerCallCountBeforeRemoveListener = firstListener.mock.calls.length;
    authenticator.removeEventListener(IdentityChangedEventIdentifier, firstListener);
    // dispatch event, which should have no listeners
    eventTarget.dispatchEvent(
      IdentityChangedEvent({
        identity: createIdentityDescriptor(createNewIdentity()),
      }),
    );

    expect(firstListener).toBeCalledTimes(listenerCallCountBeforeRemoveListener);
  });
});
