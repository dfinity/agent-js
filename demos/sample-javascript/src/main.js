import {
  AnonymousIdentity,
  blobFromHex,
  HttpAgent,
  makeNonceTransform,
  Principal,
} from '@dfinity/agent';
import {
  DelegationChain,
  DelegationIdentity,
  Ed25519KeyIdentity,
  LedgerManager,
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
const connectLedgerBtn = document.getElementById("connectLedgerBtn");
const ledgerPrincipleEl = document.getElementById("ledgerPrinciple");
const checkAddressBtn = document.getElementById("checkAddressBtn");
const sendBtn = document.getElementById("sendBtn");

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
  const actor = agent.makeActorFactory(({ IDL }) => IDL.Service({
    whoami: IDL.Func([], [IDL.Principal], []),
  }))({ agent, canisterId });

  whoAmIResponseEl.innerText = "Loading..."

  // Similar to the sample project on dfx new:
  actor.whoami().then(principal => {
    whoAmIResponseEl.innerText = principal.toText();
  });
});

let ledger_manager = undefined;
let ledger_identity = undefined;
const ledger_canister_id = Principal.fromText('ryjl3-tyaaa-aaaaa-aaaba-cai');
const governance_canister_id = Principal.fromText('rrkah-fqaaa-aaaaa-aaaaq-cai');

connectLedgerBtn.addEventListener("click", async () => {
  ledger_manager = await LedgerManager.fromWebusb();
  ledger_manager.setLedgerCanisterId(ledger_canister_id);
  ledger_manager.setGovernanceCanisterId(governance_canister_id);

  ledger_identity = await ledger_manager.getLedgerIdentity();
  ledgerPrincipleEl.innerText = `Principle: ${ledger_identity.getPrincipal().toText()}`;
});

checkAddressBtn.addEventListener("click", async () => {
  await ledger_identity.showAddressAndPubKeyOnDevice();
});

sendBtn.addEventListener("click", async () => {
  // Need to run a replica locally which has ledger canister running on it
  const agent = new HttpAgent({ host: "http://127.0.0.1:8888", identity: ledger_identity });
  // Ledger Hardware Wallet requires that the request must contain a nonce
  agent.addTransform(makeNonceTransform());

  const resp = await agent.call(ledger_canister_id,
    {
      methodName: "send",
      arg: blobFromHex("0A0012050A0308E8071A0308890122220A2001010101010101010101010101010101010101010101010101010101010101012A220A2035548EC29E9D85305850E87A2D2642FE7214FF4BB36334070DEAFC3345C3B127"),
    });
  console.log(resp);
});