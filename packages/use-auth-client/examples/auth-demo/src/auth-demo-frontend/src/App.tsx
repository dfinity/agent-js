import { FormEvent, useState } from 'react';
import {
  idlFactory as helloFactory,
  canisterId as helloId,
} from '../../declarations/auth-demo-backend';
import { _SERVICE as HELLO_SERVICE } from '../../declarations/auth-demo-backend/auth-demo-backend.did';
import {
  idlFactory as whoamiFactory,
  canisterId as whoamiId,
} from '../../declarations/auth-demo-backend';
import { _SERVICE as WHOAMI_SERVICE } from '../../declarations/auth-demo-backend/auth-demo-backend.did';
import { useAuthClient } from '../../../../../src/index';
import type { ActorSubclass } from '@dfinity/agent';
import IILogo from './IILogo.svg';

export interface ProcessEnv {
  [key: string]: string | undefined;
}

declare var process: {
  env: ProcessEnv;
};

/**
 *
 * @returns app
 */
function App() {
  const identityProvider =
    // eslint-disable-next-line no-undef
    process.env.DFX_NETWORK === 'local'
      ? // eslint-disable-next-line no-undef
        `http://${process.env.CANISTER_ID_INTERNET_IDENTITY}.localhost:4943`
      : 'https://identity.internetcomputer.org';

  const { isAuthenticated, login, logout, actors } = useAuthClient({
    loginOptions: {
      identityProvider,
    },
    actorOptions: {
      whoami_canister: {
        canisterId: whoamiId,
        idlFactory: whoamiFactory,
      },
      greet_canister: {
        canisterId: helloId,
        idlFactory: helloFactory,
      },
    },
  });

  const { whoami_canister, greet_canister } = actors as unknown as {
    whoami_canister: ActorSubclass<WHOAMI_SERVICE>;
    greet_canister: ActorSubclass<HELLO_SERVICE>;
  };

  const [greeting, setGreeting] = useState('');
  const [whoamiText, setWhoamiText] = useState('');

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = (event.target as HTMLFormElement).querySelector('input')?.value || '';
    greet_canister.greet(name).then(greeting => {
      setGreeting(greeting);
    });
    return false;
  }

  return (
    <main>
      <img src="/logo2.svg" alt="DFINITY logo" />
      <br />
      <br />
      <form action="#" onSubmit={handleSubmit}>
        <label htmlFor="name">Enter your name: &nbsp;</label>
        <input id="name" alt="Name" type="text" />
        <button type="submit">Click Me!</button>
      </form>
      <section id="greeting">{greeting}</section>
      <hr />
      <section id="login-section">
        <h2>Log in and test your identity</h2>
        <button id="login" onClick={login}>
          Login with Internet Identity
          <img src={IILogo} alt="Internet Identity Logo" />
        </button>
        <button id="logout" onClick={logout}>
          logout
        </button>
        <p>{isAuthenticated ? 'You are logged in' : 'You are not logged in'}</p>
        <button
          onClick={async () => {
            const whoami = await whoami_canister.whoami();
            setWhoamiText(whoami.toString());
          }}
        >
          Whoami
        </button>
        <section id="whoami">{whoamiText.toString()}</section>
      </section>
    </main>
  );
}

export default App;
