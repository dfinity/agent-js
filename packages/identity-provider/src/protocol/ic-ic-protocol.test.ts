import * as icid from './ic-id-protocol';

describe('ic-id-protocol', () => {
  it('can parse AuthenticationResponse fromQueryString', async () => {
    const authenticationResponse = icid.fromQueryString(
      new URLSearchParams(
        '?access_token=accessTokenValue&expires_in=2099000000&token_type=bearer&redirect_uri=http%3A%2F%2Flocalhost%3A8080%2Frelying-party-demo%2Foauth%2Fredirect_uri',
      ),
    );
    expect(authenticationResponse.accessToken).toStrictEqual('accessTokenValue');
    expect(authenticationResponse.tokenType).toStrictEqual('bearer');
    expect(authenticationResponse.redirectURI).toStrictEqual(
      'http://localhost:8080/relying-party-demo/oauth/redirect_uri',
    );
    expect(authenticationResponse.expiresIn).toStrictEqual(2099000000);
  });
});
