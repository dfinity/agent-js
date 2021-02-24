import { IdentityProviderAgent, SendAuthenticationRequestCommand } from './idp-agent';
import { Principal, blobFromHex, derBlobFromBlob } from '@dfinity/agent';
import {
  UrlTransport,
  RedirectTransport,
  IdentityProviderAgentEnvelope,
  Transport,
} from './transport';
import { unsafeTemporaryIdentityProvider } from '.';
import { Ed25519KeyIdentity } from '../identity/ed25519';

/**
 * Create a Transport that it is useful for testing what gets sent over the transport.
 * Also returns array of sent messages. (doesn't actually send them anywhere).
 */
function createTestTransport() {
  const sent: Array<IdentityProviderAgentEnvelope> = [];
  const send = async (s: IdentityProviderAgentEnvelope) => {
    sent.push(s);
  };
  const transport: Transport<IdentityProviderAgentEnvelope> = { send };
  return { sent, transport };
}

/**
 * Create a @dfinity/agent that is useful for testing.
 * @param transport - custom transport to use to send messages
 */
function createTestAgent(transport: Transport<IdentityProviderAgentEnvelope>) {
  const agent = new IdentityProviderAgent({
    identityProvider: unsafeTemporaryIdentityProvider,
    transport,
    location: {
      href: 'https://example.com/',
    },
  });
  return agent;
}

const samplePublicKeyHex =
  '305e300c060a2b0601040183b8430101034e00a5010203262001215820e8bdd09933e81019b4acbe17301ac6ccd0f5db8dd892267ee18b620e603bea632258209b125cf1b2f23ab42796a1ee88336dae244d6d8058f3c192d1fa79b1d05ff473';

const exampleRedirectUri = new URL(
  `https://${Principal.fromText('unvpp-2aaaa-aaaaa-qabsq-cai').toText()}.ic0.app/`,
);

describe('@dfinity/authentication/src/identity-provider/idp-agent', () => {
  it('can send AuthenticationRequest through custom transport', async () => {
    const canisterPrincipal = Principal.fromText('unvpp-2aaaa-aaaaa-qabsq-cai');
    const redirectUri = new URL(`https://${canisterPrincipal.toText()}.ic0.app/`);
    const { sent, transport } = createTestTransport();
    const agent = createTestAgent(transport);
    await agent.sendAuthenticationRequest({
      session: {
        identity: {
          getPublicKey() {
            return {
              toDer() {
                return derBlobFromBlob(blobFromHex(samplePublicKeyHex));
              },
            };
          },
        },
      },
      redirectUri,
      scope: [
        {
          type: 'CanisterScope',
          principal: canisterPrincipal,
        },
      ],
    });
    expect(sent.length).toEqual(1);
    const { to, message } = sent[0];
    // default IDP to the staging one
    expect(to).toEqual(unsafeTemporaryIdentityProvider);
    if (message.type !== 'AuthenticationRequest') {
      throw new Error(`Expected AuthentiationRequest`);
    }
    expect(message).toMatchObject({
      type: 'AuthenticationRequest',
      scope: canisterPrincipal.toText(),
    });
    // sessionIdentity was generated for us.
    const hexPattern = /[0-9a-f]/gi;
    console.log({ message });
    expect(message.sessionIdentity.hex.match(hexPattern)).toBeTruthy();
  });
  it('can send AuthenticationRequest through UrlTransport', async () => {
    let urls: Array<URL> = [];
    const transport = UrlTransport((url: URL) => {
      urls = [...urls, url];
    });
    const agent = createTestAgent(transport);
    const sendAuthenticationRequestCommand: SendAuthenticationRequestCommand = {
      redirectUri: exampleRedirectUri,
      scope: [],
      session: {
        identity: Ed25519KeyIdentity.generate(),
      },
    };
    await agent.sendAuthenticationRequest(sendAuthenticationRequestCommand);
    expect(urls.length).toEqual(1);
    const authenticationRequestUrl = urls[0];
    expect(authenticationRequestUrl.toString()).toBeTruthy();
    expect(authenticationRequestUrl.searchParams.get('redirect_uri')).toEqual(
      sendAuthenticationRequestCommand.redirectUri.toString(),
    );
    expect(authenticationRequestUrl.searchParams.get('scope')).toEqual('');
    expect(authenticationRequestUrl.searchParams.get('login_hint')).toBeTruthy();
  });
  it('can send AuthenticationRequest through RedirectTransport', async () => {
    const assignments: URL[] = [];
    const locationProxy: Location = new Proxy(globalThis.location, {
      get(target, key, receiver) {
        const reflected = Reflect.get(target, key, receiver);
        if (key === 'assign' && target instanceof Location) {
          return function (url: string | URL) {
            assignments.push(typeof url === 'string' ? new URL(url) : url);
          };
        }
        return reflected;
      },
    });
    const transport = RedirectTransport(locationProxy);
    const agent = createTestAgent(transport);
    const sendAuthenticationRequestCommand: SendAuthenticationRequestCommand = {
      redirectUri: exampleRedirectUri,
      scope: [],
      session: {
        identity: Ed25519KeyIdentity.generate(),
      },
    };
    await agent.sendAuthenticationRequest(sendAuthenticationRequestCommand);
    expect(assignments.length).toEqual(1);
    const assignedUrl = assignments[0];
    expect(assignedUrl.searchParams.get('redirect_uri')).toEqual(
      sendAuthenticationRequestCommand.redirectUri.toString(),
    );
  });
});
