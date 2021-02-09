import { Authenticator } from './Authenticator';

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
});
