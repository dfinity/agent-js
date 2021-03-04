import {AnonymousIdentity, HttpAgent, Principal} from '@dfinity/agent';
import {
  Authenticator,
  DelegationChain,
  DelegationIdentity,
  Ed25519KeyIdentity
} from '@dfinity/authentication';

const signInBtn = document.getElementById("signinBtn");
const signOutBtn = document.getElementById("signoutBtn");
const whoamiBtn = document.getElementById("whoamiBtn");
const hostUrlEl = document.getElementById("hostUrl");
const whoAmIResponseEl = document.getElementById("whoamiResponse");
const canisterIdEl = document.getElementById("canisterId");
const principalEl = document.getElementById("principal");
const idpUrlEl = document.getElementById("idpUrl");

let identity = new AnonymousIdentity();

// This should not be needed if we want to use the default identity provider
// which is https://auth.ic0.app/.
const getIdpElUrl = () => new URL(idpUrlEl.value);
// Remove the lines above to use the default authenticator.

function login() {
  identity = Ed25519KeyIdentity.generate();
  const session = { identity };
  localStorage.setItem('ic-session', JSON.stringify(session));
  const loginAuthenticator = new Authenticator({ identityProvider: { url: getIdpElUrl() }});
  loginAuthenticator.sendAuthenticationRequest({
    identityProvider: {
      url: getIdpElUrl(),
    },
    redirectUri: window.location.origin,
    session,
    scope: [
      { principal: Principal.fromText(canisterIdEl.value) },
    ],
  });
}

function logout() {
  localStorage.removeItem('ic-session');
  identity = new AnonymousIdentity();
  updatePrincipal();
}

function handleCallback(session) {
  const searchParams = new URLSearchParams(location.search);
  // Remove the `#` at the start.
  const hashParams = new URLSearchParams(location.hash.substr(1));

  const maybeAccessToken = searchParams.get('access_token') || hashParams.get('access_token');
  if (maybeAccessToken) {
    const chainJson = [...maybeAccessToken]
      .reduce((acc, curr, i) => {
        acc[Math.floor(i / 2)] = (acc[i / 2 | 0] || "") + curr;
        return acc;
      }, [])
      .map(x => Number.parseInt(x, 16))
      .map(x => String.fromCharCode(x))
      .join('');

    const key = Ed25519KeyIdentity.fromParsedJson(session.identity);
    identity = DelegationIdentity.fromDelegation(key, DelegationChain.fromJSON(chainJson));

    localStorage.setItem('ic-session', JSON.stringify({
      ...session,
      authenticationResponse: chainJson,
    }));
  }
}

signInBtn.addEventListener("click", login);
signOutBtn.addEventListener("click", logout);

function updatePrincipal() {
  principalEl.innerHTML = `<div>ID: ${identity.getPrincipal().toText()}</div>`;
}

function init() {
  // Verify if an identity already exists.
  const maybeSession = localStorage.getItem('ic-session');
  if (maybeSession) {
    let session = JSON.parse(maybeSession);
    // TODO: move this into Authenticator.
    if (session.authenticationResponse) {
      const key = Ed25519KeyIdentity.fromParsedJson(session.identity);
      const chain = DelegationChain.fromJSON(session.authenticationResponse);
      identity = DelegationIdentity.fromDelegation(key, chain);
    } else {
      handleCallback(session);
    }
  }

  updatePrincipal();
}

window.onload = init;

whoamiBtn.addEventListener("click", () => {
  if (identity === null) {
    alert("No identity... Window not loaded?");
    return;
  }

  // We either have an Agent with an anonymous identity (not authenticated),
  // or already authenticated agent, or parsing the redirect from window.location.
  const agent = new HttpAgent({
    host: hostUrlEl.value,
    identity,
  });

  const canisterId = Principal.fromText(canisterIdEl.value);
  const actor = agent.makeActorFactory(({IDL}) => IDL.Service({
    whoami: IDL.Func([], [IDL.Principal], []),
  }))({agent, canisterId});

  whoAmIResponseEl.innerText = "Loading..."

  // Similar to the sample project on dfx new:
  actor.whoami().then(principal => {
    whoAmIResponseEl.innerText = principal.toText();
  });
});
