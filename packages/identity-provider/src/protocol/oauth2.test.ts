import { fromQueryString } from './oauth2';
import * as assert from 'assert';

describe('oauth2', () => {
  it('can parse authorizationRequest fromQueryString', async () => {
    const accessTokenResponse = fromQueryString(
      new URLSearchParams(
        '?access_token=accessTokenValue&expires_in=2099000000&token_type=bearer&redirect_uri=http%3A%2F%2Flocalhost%3A8080%2Frelying-party-demo%2Foauth%2Fredirect_uri',
      ),
    );
    assert.ok(accessTokenResponse);
    assert.ok('access_token' in accessTokenResponse, 'parsed message should have access_token');
    expect(accessTokenResponse.access_token).toStrictEqual('accessTokenValue');
    expect(accessTokenResponse.token_type).toStrictEqual('bearer');
    expect(accessTokenResponse.expires_in).toStrictEqual(2099000000);
  });
  it('can parse AuthorizationRequest fromQueryString', async () => {
    const authorizationRequest = fromQueryString(
      new URLSearchParams(
        '?response_type=token&client_id=s6BhdRkqt3&state=xyz&redirect_uri=https%3A%2F%2Fclient%2Eexample%2Ecom%2Fcb&login_hint=xyz',
      ),
    );
    assert.ok(authorizationRequest);
    assert.ok('redirect_uri' in authorizationRequest, 'parsed message should have access_token');
    expect(authorizationRequest.response_type).toStrictEqual('token');
    expect(authorizationRequest.client_id).toStrictEqual('s6BhdRkqt3');
    expect(authorizationRequest.state).toStrictEqual('xyz');
    expect(authorizationRequest.redirect_uri).toStrictEqual('https://client.example.com/cb');
    expect(authorizationRequest.login_hint).toStrictEqual('xyz');
  });
});
