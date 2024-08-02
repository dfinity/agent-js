import { useState } from 'react';
import { idlFactory, canisterId } from 'declarations/auth-demo-backend';
import { useAuthClient } from '../../../../../src/index';
import IILogo from './IILogo.svg';

function App() {
  const identityProvider =
    process.env.DFX_NETWORK === 'local'
      ? `http://${process.env.CANISTER_ID_INTERNET_IDENTITY}.localhost:4943`
      : 'https://identity.ic0.app';

  const { isAuthenticated, login, logout, actor } = useAuthClient({
    loginOptions: {
      identityProvider,
    },
    actorOptions: {
      canisterId,
      idlFactory,
    },
  });

  const [greeting, setGreeting] = useState('');
  const [whoamiText, setWhoamiText] = useState('');

  function handleSubmit(event) {
    event.preventDefault();
    const name = event.target.elements.name.value;
    actor.greet(name).then(greeting => {
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
            const whoami = await actor.whoami();
            setWhoamiText(whoami);
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
