import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { useAuthClient } from '../src/use-auth-client';
import { describe, it } from '@jest/globals';

describe('useAuthClient', () => {
  it('should return an authClient object with the expected properties', async () => {
    function Component() {
      const { authClient, identity, isAuthenticated, login, logout } = useAuthClient();
      return (
        <div>
          <div>authClient: {authClient}</div>
          <div>identity: {identity}</div>
          <div data-testid="isAuthenticated">{String(isAuthenticated)}</div>
          <button onClick={login}>Login</button>
          <button onClick={logout}>Logout</button>
        </div>
      );
    }
    render(<Component />);

    const isAuthenticated = screen.getByTestId('isAuthenticated');
    expect(isAuthenticated).toHaveTextContent('false');
  });
});
