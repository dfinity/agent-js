import { fromQueryString } from './oauth2';

describe('oauth2', () => {
  it('can parse AccessTokenResponse fromQueryString', async () => {
    const accessTokenResponse = fromQueryString(
      new URLSearchParams(
        '?access_token=accessTokenValue&expires_in=2099000000&token_type=bearer&redirect_uri=http%3A%2F%2Flocalhost%3A8080%2Frelying-party-demo%2Foauth%2Fredirect_uri',
      ),
    );
    expect(accessTokenResponse.access_token).toStrictEqual('accessTokenValue');
    expect(accessTokenResponse.token_type).toStrictEqual('bearer');
    expect(accessTokenResponse.expires_in).toStrictEqual(2099000000);
  });
});
