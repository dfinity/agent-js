import { HttpAgent, Principal } from '@dfinity/agent';
import { AuthenticationClient } from './authClient';

const signInBtn = document.getElementById("signinBtn");
const signOutBtn = document.getElementById("signoutBtn");
const whoamiBtn = document.getElementById("whoamiBtn");
const hostUrlEl = document.getElementById("hostUrl");
const whoAmIResponseEl = document.getElementById("whoamiResponse");
const canisterIdEl = document.getElementById("canisterId");
const principalEl = document.getElementById("principal");
const idpUrlEl = document.getElementById("idpUrl");

// This is a canister that exists in the main network.
const authClient = new AuthenticationClient({
  identityProvider: new URL(idpUrlEl.value),
});

signInBtn.addEventListener("click", async () => {
  // Creates an Ed25519 identity, serializes it to JSON, saves it to
  // storage, then window.location = CreateUrlFromOptions(options);
  await new AuthenticationClient({
    identityProvider: new URL(idpUrlEl.value),
  }).loginWithRedirect({
    redirectUri: window.location.origin,
    scope: [{ principal: Principal.fromText(canisterIdEl.value) }],
  });
});

signOutBtn.addEventListener("click", async () => {
  await new AuthenticationClient({
    identityProvider: new URL(idpUrlEl.value),
  }).logout({
    returnTo: window.location.origin,
  });  // This basically clear localStorage then window.location = options.returnTo
});

let identity = authClient.getIdentity();

window.onload = async () => {
  const isAuthenticated = await authClient.isAuthenticated();
  if (isAuthenticated) {
    console.log("User already authenticated");
    identity = await authClient.getIdentity();
  } else {
    if (authClient.shouldParseResult(location)) {
      try {
        // Gets search and hash and extracts all info,
        // calls storage.set to store the authResponse object (DelegationChain),
        // creates a DelegationIdentity with the Ed25519 from storage
        // and the authentication response from this.
        const result = await authClient.handleRedirectCallback(location);
        // This is instanceof DelegationIdentity
        identity = result.identity;
      } catch (err) {
        console.error("Error parsing redirect:", err);
      }

      window.history.replaceState({}, document.title, "/");
    }
  }

  principalEl.innerText = identity.getPrincipal().toText();
};

whoamiBtn.addEventListener("click", async () => {
  if (identity === null) {
    console.error("No identity... Window not loaded?");
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
    whoami: IDL.Func([], [IDL.Principal], ['query']),
  }))({agent, canisterId});

  // Similar to the sample project on dfx new:
  whoAmIResponseEl.innerText = (await actor.whoami()).toText();
});
