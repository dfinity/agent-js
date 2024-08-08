import * as React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import { useAuthClient } from '../src/use-auth-client';
import { describe, it, jest, afterEach } from '@jest/globals';

afterEach(cleanup);

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
    render(<Component />);

    (
      expect(screen.getByTestId('isAuthenticated')) as unknown as {
        toHaveTextContent: (str: string) => boolean;
      }
    ).toHaveTextContent('false');
  });
  it('should support configs for multiple actors', async () => {
    interface Props {
      children?: React.ReactNode;
    }

    const idlFactory = ({ IDL }) => {
      return IDL.Service({ whoami: IDL.Func([], [IDL.Principal], ['query']) });
    };
    const Component: React.FC<Props> = () => {
      const { actors } = useAuthClient({
        actorOptions: {
          actor1: {
            agentOptions: {
              fetch: jest.fn() as typeof globalThis.fetch,
            },
            canisterId: 'rrkah-fqaaa-aaaaa-aaaaq-cai',
            idlFactory,
          },
          actor2: {
            agentOptions: {
              fetch: jest.fn() as typeof globalThis.fetch,
            },
            canisterId: 'rrkah-fqaaa-aaaaa-aaaaq-cai',
            idlFactory,
          },
        },
      });
      return (
        <div>
          <div data-testid="actors">{JSON.stringify(actors)}</div>
        </div>
      );
    };
    render(<Component />);

    (
      expect(screen.getByTestId('actors')) as unknown as {
        toHaveTextContent: (str: string) => boolean;
      }
    ).toHaveTextContent('{}');

    jest.useRealTimers();

    // wait for the actors to be set
    await new Promise(resolve => setTimeout(resolve, 1000));

    (
      expect(screen.getByTestId('actors')) as unknown as {
        toHaveTextContent: (str: string) => boolean;
      }
    ).toHaveTextContent('{"actor1":{},"actor2":{}}');
  });
});
