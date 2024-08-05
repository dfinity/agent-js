import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { useAuthClient } from '../src/use-auth-client';
import { describe, it } from '@jest/globals';

describe('useAuthClient', () => {
  it('should return an authClient object with the expected properties', async () => {
    interface Props {
      children?: React.ReactNode;
    }
    const Component: React.FC<Props> = () => {
      const { isAuthenticated, login, logout } = useAuthClient();
      return (
        <div>
          <div data-testid="isAuthenticated">{String(isAuthenticated)}</div>
          <button onClick={login}>Login</button>
          <button onClick={logout}>Logout</button>
        </div>
      );
    };
    // disable typescript
    render(<Component />);

    (
      expect(screen.getByTestId('isAuthenticated')) as unknown as {
        toHaveTextContent: (str: string) => boolean;
      }
    ).toHaveTextContent('false');
  });
});
