import { authenticator } from '.';

/**
 * Right now this is just an instance of Authenticator.
 * But we export this preconstructed-with-good-defaults object as a convenience,
 * and technically it's kind of a separate contract we should test to prevent regression.
 */
test('exports authenticator', () => {
  expect(typeof authenticator.addEventListener).toEqual('function');
  expect(typeof authenticator.removeEventListener).toEqual('function');
  expect(typeof authenticator.sendAuthenticationRequest).toEqual('function');
  expect(typeof authenticator.useSession).toEqual('function');
});
