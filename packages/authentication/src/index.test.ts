import * as authentication from '.';

test('exports authenticator', () => {
  const { authenticator } = authentication;
  expect(typeof authenticator.sendAuthenticationRequest).toEqual('function');
  expect(typeof authenticator.receiveAuthenticationResponse).toEqual('function');
});
