import { AuthClient } from './index';

describe('Auth Client', () => {
  it('should initialize with an AnonymousIdentity', async () => {
    const test = await AuthClient.create();
    expect(await test.isAuthenticated()).toBe(false);
  });

  it('should handle a redirect callback with no token', async () => {
    const test = await AuthClient.create();
    expect(await test.handleRedirectCallback()).toBe(null); //?
  });

  it.todo('should handle a redirect callback with a token');
  it.todo('should login with redirect');

  it('should log users out', async () => {
    const test = await AuthClient.create();
    await test.logout();
  });
});
