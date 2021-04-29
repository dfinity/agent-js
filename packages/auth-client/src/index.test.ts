import { AuthClient } from './index';

describe.only('Auth Client', () => {
  it('should initialize with an AnonymousIdentity', async () => {
    const test = await AuthClient.create();
    expect(await test.isAuthenticated()).toBe(false);
  });

  it('should login with a popup', async () => {
    const test = await AuthClient.create();
    window.open = jest.fn();
    await test.login();
    expect(globalThis.open).toBeCalled();
  });

  it.todo('should handle an authorize-client message');
  it.todo('should handle an authorize-client-success message');
  it.todo('should handle an authorize-client-failure message');

  it('should log users out', async () => {
    const test = await AuthClient.create();
    await test.logout();
  });
});
