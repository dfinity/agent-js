import * as icid from './ic-id-protocol';
import { DelegationChain } from '@dfinity/authentication';
import { hexEncodeUintArray } from '../bytes';
import * as assert from 'assert';
import { Principal } from '@dfinity/agent/src/idl';

const delegationChainSample = {
  json: {
    delegations: [
      {
        delegation: {
          expiration: '7d1c32c0',
          pubkey:
            '302a300506032b6570032100fee8d6aae6face6752218801334b46e64126723753ffa8cc7c537e752a7e8fe0',
        },
        signature:
          '5ba1359e60779300ad65c1af143dd43df0e1db6eda7ae7250152572e0e633de0dc18dfed107326dd2b94efc1a3e70c2a287c73708fa29a303ac3275c8ae3760b',
      },
      {
        delegation: {
          expiration: '164d5846da721640',
          pubkey:
            '302a300506032b65700321009d0559b47dc4e8443fad89df3d090ad861315e2fa0cc139e625523e24665b244',
        },
        signature:
          '16d9c02e2b386e3722533310c38ded520da1b322956fff38f3ec538fc57e38ae619e2a833665932f37e7cac7b6f08c1fb0316422d542db5ec9db14909c26f70b',
      },
    ],
    publicKey:
      '302a300506032b65700321008be7c920c2dc93586e067f02eaa026dd6e232e718ee9e6b4d3f12ec61bb66e92',
  },
  bearerToken:
    '7b2264656c65676174696f6e73223a5b7b2264656c65676174696f6e223a7b2265787069726174696f6e223a223764316333326330222c227075626b6579223a2233303261333030353036303332623635373030333231303066656538643661616536666163653637353232313838303133333462343665363431323637323337353366666138636337633533376537353261376538666530227d2c227369676e6174757265223a223562613133353965363037373933303061643635633161663134336464343364663065316462366564613761653732353031353235373265306536333364653064633138646665643130373332366464326239346566633161336537306332613238376337333730386661323961333033616333323735633861653337363062227d2c7b2264656c65676174696f6e223a7b2265787069726174696f6e223a2231363464353834366461373231363430222c227075626b6579223a2233303261333030353036303332623635373030333231303039643035353962343764633465383434336661643839646633643039306164383631333135653266613063633133396536323535323365323436363562323434227d2c227369676e6174757265223a223136643963303265326233383665333732323533333331306333386465643532306461316233323239353666666633386633656335333866633537653338616536313965326138333336363539333266333765376361633762366630386331666230333136343232643534326462356563396462313439303963323666373062227d5d2c227075626c69634b6579223a2233303261333030353036303332623635373030333231303038626537633932306332646339333538366530363766303265616130323664643665323332653731386565396536623464336631326563363162623636653932227d',
};

describe('ic-id-protocol', () => {
  it('can parse AuthenticationResponse fromQueryString', async () => {
    const authenticationResponse = icid.fromQueryString(
      new URLSearchParams(
        '?scope=a%20b&access_token=accessTokenValue&expires_in=2099000000&token_type=bearer&redirect_uri=http%3A%2F%2Flocalhost%3A8080%2Frelying-party-demo%2Foauth%2Fredirect_uri',
      ),
    );
    assert.ok(authenticationResponse);
    assert.ok('accessToken' in authenticationResponse);
    expect(authenticationResponse.accessToken).toStrictEqual('accessTokenValue');
    expect(authenticationResponse.tokenType).toStrictEqual('bearer');
    expect(authenticationResponse.expiresIn).toStrictEqual(2099000000);
  });
  it('can parse AuthenticationRequest fromQueryString', async () => {
    const req = icid.fromQueryString(
      new URLSearchParams(
        '?response_type=token&client_id=s6BhdRkqt3&state=xyz&redirect_uri=https%3A%2F%2Fclient%2Eexample%2Ecom%2Fcb&login_hint=302a300506032b65700321009d0559b47dc4e8443fad89df3d090ad861315e2fa0cc139e625523e24665b244',
      ),
    );
    assert.ok(req);
    assert.ok('sessionIdentity' in req);
    expect(req.sessionIdentity.hex).toEqual(
      '302a300506032b65700321009d0559b47dc4e8443fad89df3d090ad861315e2fa0cc139e625523e24665b244',
    );
  });
  it('can create a bearer token', () => {
    const delegationChain = DelegationChain.fromJSON(JSON.stringify(delegationChainSample.json));
    const bearerToken = icid.createBearerToken({ delegationChain });
    expect(bearerToken).toEqual(delegationChainSample.bearerToken);
  });
  it('can parse access_token string as hex-encoded-JSON', () => {
    const parsedAccessToken = icid.parseBearerToken(delegationChainSample.bearerToken);
    expect(parsedAccessToken).toEqual(delegationChainSample.json);
  });
  it('can create DelegationChain.fromJson of parsed bearer token', () => {
    const parsedAccessToken = icid.parseBearerToken(delegationChainSample.bearerToken);
    const delegationChain = DelegationChain.fromJSON(JSON.stringify(parsedAccessToken));
    expect(hexEncodeUintArray(delegationChain.publicKey)).toEqual(
      delegationChainSample.json.publicKey,
    );
  });
});

describe('ic-id-protocol createAuthenticationRequestUrl', () => {
  it('preserves scope', () => {
    const authenticationRequest: icid.AuthenticationRequest = {
      type: 'AuthenticationRequest',
      sessionIdentity: {
        hex:
          '302a300506032b65700321009d0559b47dc4e8443fad89df3d090ad861315e2fa0cc139e625523e24665b244',
      },
      redirectUri: 'https://rp/redirect_uri',
      scope: 'a b',
    };
    const identityProviderUrl = new URL('https://id.ic0.app');
    const authenticationRequestUrl = icid.createAuthenticationRequestUrl({
      authenticationRequest,
      identityProviderUrl,
    });
    expect(authenticationRequestUrl.searchParams.get('scope')).toEqual('a b');
  });
});

describe('ic-id-protocol parseScopeString', () => {
  it('allows old-style principal texts', () => {
    // bengo: I'm not sure whether it's a good idea to allow these or not.
    // The test passes, so I'lle ave it for now, but this is just a unit test.
    // It may best best to explicitly reject these old-style principal texts, or to parse/reserialize them as the new, shorter ones?
    const oldStyleCanisterPrincipalText = 'ccgce-babaa-aaaaa-aaaaa-caaaa-aaaaa-aaaaa-q';
    const parsed = icid.parseScopeString(oldStyleCanisterPrincipalText);
    const [canisterScope] = parsed.canisters;
    expect(canisterScope.principal.toText()).toEqual(oldStyleCanisterPrincipalText);
  });
  it('parses space-delimited scope string', () => {
    const canisterA = 'u76ha-lyaaa-aaaab-aacha-cai';
    const canisterB = 'jyi7r-7aaaa-aaaab-aaabq-cai';
    const scope = [canisterA, canisterB].join(' ');
    const parsedScope = icid.parseScopeString(scope);
    expect(parsedScope.canisters.length).toEqual(2);
    const parsedScopeCanisterPrincipalTextSet = new Set(
      parsedScope.canisters.map(cs => cs.principal.toText()),
    );
    expect(parsedScopeCanisterPrincipalTextSet).toStrictEqual(new Set([canisterA, canisterB]));
  });
  it('can parse and restringify', () => {
    const examples = [
      'u76ha-lyaaa-aaaab-aacha-cai',
      'u76ha-lyaaa-aaaab-aacha-cai jyi7r-7aaaa-aaaab-aaabq-cai',
      'jyi7r-7aaaa-aaaab-aaabq-cai u76ha-lyaaa-aaaab-aacha-cai',
    ];
    for (const scope of examples) {
      expect(icid.stringifyScope(icid.parseScopeString(scope))).toEqual(scope);
    }
  });
});
