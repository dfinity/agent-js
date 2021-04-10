import { AnonymousIdentity, HttpAgent, Principal } from '@dfinity/agent';
import {
  DelegationChain,
  DelegationIdentity,
  Ed25519KeyIdentity
} from '@dfinity/identity';
import {
  createAuthenticationRequestUrl,
  createDelegationChainFromAccessToken,
  getAccessTokenFromWindow,
  isDelegationValid,
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

  const url = createAuthenticationRequestUrl({
    publicKey: session.identity.getPublicKey(),
    scope: [canisterIdEl.value],
    identityProvider: getIdpElUrl(),
  });

  window.location.href = url.toString();
}

function logout() {
  localStorage.removeItem('ic-session');
  identity = new AnonymousIdentity();
  updatePrincipal();
}

function handleCallback(session) {
  const maybeAccessToken = getAccessTokenFromWindow();
  if (maybeAccessToken) {
    const key = Ed25519KeyIdentity.fromParsedJson(session.identity);
    const chain = createDelegationChainFromAccessToken(maybeAccessToken);
    identity = DelegationIdentity.fromDelegation(key, chain);

    localStorage.setItem('ic-session', JSON.stringify({
      ...session,
      authenticationResponse: chain.toJSON(),
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

      if (isDelegationValid(chain)) {
        identity = DelegationIdentity.fromDelegation(key, chain);
      } else {
        logout();
      }
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
