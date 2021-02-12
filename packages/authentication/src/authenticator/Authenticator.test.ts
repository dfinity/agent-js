import { Authenticator } from './Authenticator';
// import { IdentityChangedEventIdentifier } from './events';

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
  it.todo('can addEventListener("event", listener) and then remove', /* async () => {
    const authn = new Authenticator
    let listenerCalled = false;
    
    async function testAddEventListener() {
      await new Promise((resolve) => {
        authn.addEventListener(IdentityChangedEventIdentifier, listener)
  
        authn.useSession({
          authenticationResponse: sampleAuthenticationResponse(),
          identity: {
            sign: async (challenge) => { return challenge },
          }
        })
    
        function listener() {
          listenerCalled = true;
          resolve();
        }
      });
    }

    await Promise.race([
      new Promise((resolve,reject) => setInterval(() => reject(new Error('testAddEventListener timeout')), 1000)),
      testAddEventListener(),
    ])

    expect(listenerCalled).toEqual(true);

    // @todo test removal
  }*/)
});

// function sampleAuthenticationResponse() {
//   return "http://localhost:8000/?canisterId=rrkah-fqaaa-aaaaa-aaaaq-cai&idp=http%3A%2F%2Flocalhost%3A8080%2Fauthorization&access_token=7b2264656c65676174696f6e73223a5b7b2264656c65676174696f6e223a7b2265787069726174696f6e223a2231363466373132336130333234373030222c227075626b6579223a2233303261333030353036303332623635373030333231303063656363313530376463316464643732393539353163323930383838663039356164623930343464316237336436393665366466303635643638336264346663227d2c227369676e6174757265223a223533663833653839363862383632663135376462616333323937363130666563376632353739303262363733313136396234393930343133353161393335393862373136373032666534363264303039323632626530326337383664623233373366393364353538333663666561353339346565356232623038323964363062227d5d2c227075626c69634b6579223a2233303261333030353036303332623635373030333231303031633332626439323530616263336135323164363639636237663162313533613433313464383464656333353637306633343963323564653931353939373365227d&expires_in=1607627989820000000&token_type=bearer&redirect_uri=http%3A%2F%2Flocalhost%3A8000%2F%3FcanisterId%3Drrkah-fqaaa-aaaaa-aaaaq-cai%26idp%3Dhttp%3A%2F%2Flocalhost%3A8080%2Fauthorization"
// }