import { Authenticator } from './Authenticator';

describe('@dfinity/authentication Authenticator', () => {
  it('has sendAuthenticationRequest function', () => {
    expect(typeof (new Authenticator).sendAuthenticationRequest).toEqual('function')
  });
});
