import { IdentityProviderAgent } from './idp-agent';
import { Principal } from '@dfinity/agent';
import { AuthenticationRequest, createAuthenticationRequestUrl } from '../idp-protocol/request';
import {
  UrlTransport,
  RedirectTransport,
  IdentityProviderAgentEnvelope,
  Transport,
} from './transport';
import { unsafeTemporaryIdentityProvider } from '.';
import * as assert from 'assert';

function createTestTransport() {
  const sent: Array<IdentityProviderAgentEnvelope> = [];
  const send = async (s: IdentityProviderAgentEnvelope) => {
    sent.push(s);
  };
  const transport: Transport<IdentityProviderAgentEnvelope> = { send };
  return { sent, transport };
}

function createTestAgent(spec: { transport: Transport<IdentityProviderAgentEnvelope> }) {
  const { transport } = spec;
  const agent = new IdentityProviderAgent({
    identityProvider: unsafeTemporaryIdentityProvider,
    transport,
  });
  return agent;
}

const exampleRedirectUri = new URL(
  `https://${Principal.fromText('unvpp-2aaaa-aaaaa-qabsq-cai').toText()}.ic0.app/`,
);

describe('@dfinity/authentication/src/identity-provider/idp-agent', () => {
  it('can send AuthenticationRequest through custom transport', async () => {
    const canisterPrincipal = Principal.fromText('unvpp-2aaaa-aaaaa-qabsq-cai');
    const redirectUri = new URL(`https://${canisterPrincipal.toText()}.ic0.app/`);
    const { sent, transport } = createTestTransport();
    const agent = createTestAgent({ transport });
    await agent.sendAuthenticationRequest({
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
    expect(message.sessionIdentity.hex.match(hexPattern)).toBeTruthy();
  });
  it('can send AuthenticationRequest through UrlTransport', async () => {
    let urls: Array<URL> = [];
    const transport = UrlTransport((url: URL) => {
      urls = [...urls, url];
    });
    const agent = createTestAgent({ transport });
    const sendAuthenticationRequestCommand = {
      redirectUri: exampleRedirectUri,
      scope: [],
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
    const assignments: any[] = [];
    const locationProxy = new Proxy(globalThis.location, {
      get(target, key: any, receiver) {
        const reflected = Reflect.get(target, key, receiver);
        if (key === 'assign' && target instanceof Location) {
          return function (url: string | URL) {
            assignments.push(url);
          };
        }
        return reflected;
      },
    });
    const transport = RedirectTransport({ location: locationProxy });
    const agent = createTestAgent({ transport });
    const sendAuthenticationRequestCommand = {
      redirectUri: exampleRedirectUri,
      scope: [],
    };
    await agent.sendAuthenticationRequest(sendAuthenticationRequestCommand);
    expect(assignments.length).toEqual(1);
    const assignedUrl = new URL(assignments[0]);
    expect(assignedUrl.searchParams.get('redirect_uri')).toEqual(
      sendAuthenticationRequestCommand.redirectUri.toString(),
    );
  });
});
