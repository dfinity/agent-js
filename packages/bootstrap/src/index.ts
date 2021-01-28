import {
  Actor,
  createAssetCanisterActor,
  GlobalInternetComputer,
  HttpAgent,
  IDL,
  Principal,
  SignIdentity,
  Identity,
  AnonymousIdentity,
  HttpAgentOptions,
  Agent,
} from '@dfinity/agent';
import {
  response as icidResponse,
  DelegationChain,
  DelegationIdentity,
  Ed25519KeyIdentity,
} from '@dfinity/authentication';
import { createAgent } from './host';
import { SiteInfo } from './site';
import { debug } from 'console';

declare const window: GlobalInternetComputer & Window;

const bootstrapLog = makeLog('bootstrap');
const idActorLog = makeLog('ic-id-actor');

const app = {
  get parentNode(): Element | null {
    let host: Element | null = null;
    for (const selector of ['ic-bootstrap', 'app']) {
      if ((host = document.querySelector(selector))) {
        break;
      }
    }
    return host;
  },
  render(el: Element) {
    bootstrapLog('debug', 'app.render', { el });
    const parent = this.parentNode;
    if (!parent) {
      log('debug', 'no host element found');
      return;
    }
    // remove all children of host
    while (parent.lastChild) {
      parent.removeChild(parent.lastChild);
    }
    parent.appendChild(el);
  },
};

// Retrieve and execute a JavaScript file from the server.
async function _loadJs(
  canisterId: Principal,
  filename: string,
  onload = async () => {},
): Promise<any> {
  bootstrapLog('debug', '_loadJs');
  const actor = createAssetCanisterActor({ canisterId });
  const content = await actor.retrieve(filename);
  const js = new TextDecoder().decode(new Uint8Array(content));
  // const dataUri = new Function(js);

  // Run an event function so the callee can execute some code before loading the
  // Javascript.
  await onload();

  // TODO(hansl): either get rid of eval, or rid of webpack, or make this
  // work without this horrible hack.
  return eval(js); // tslint:disable-line
}

async function _loadCandid(canisterId: Principal): Promise<any> {
  bootstrapLog('debug', '_loadCandid');
  const origin = window.location.origin;
  const url = `${origin}/_/candid?canisterId=${canisterId.toText()}&format=js`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Cannot fetch candid file`);
  }
  const js = await response.text();
  const dataUri = 'data:text/javascript;charset=utf-8,' + encodeURIComponent(js);
  // TODO(hansl): either get rid of eval, or rid of webpack, or make this
  // work without this horrible hack.
  return eval('import("' + dataUri + '")'); // tslint:disable-line
}

async function _main() {
  const bootstrapVersion = 1;
  bootstrapLog('debug', '_main');
  if (window?.ic?.bootstrapVersion >= bootstrapVersion) {
    bootstrapLog('debug', `ic.bootstrapVersion >= ${bootstrapVersion}. Skipping _main()`);
    return;
  }
  bootstrapLog('debug', 'initializing', { bootstrapVersion });
  window.ic = {
    ...window.ic,
    bootstrapVersion,
  };

  const site = await SiteInfo.fromWindow();
  const identities = DocumentIdentities(document);
  const identity = await MutableIdentity(identities);
  const agent = await createAgent(withIdentity(identity)(site));

  // Find the canister ID. Allow override from the url with 'canister_id=1234..'.
  const canisterId = site.principal;
  window.ic = {
    agent,
    bootstrapVersion,
    canister: canisterId && Actor.createActor(({ IDL: IDL_ }) => IDL_.Service({}), { canisterId }),
    HttpAgent,
    IDL,
  };

  if (!canisterId) {
    // Show an error.
    const div = document.createElement('div');
    div.innerText =
      'Could not find the canister ID to use. Please provide one in the query parameters.';

    document.body.replaceChild(div, document.body.getElementsByTagName('app').item(0)!);
  } else {
    if (window.location.pathname === '/candid') {
      // Load candid.did.js from endpoint.
      const candid = await _loadCandid(canisterId);
      const canister = window.ic.agent.makeActorFactory(candid.default)({ canisterId });
      const render = await import('./candid/candid');
      render.render(canisterId, canister);
    } else {
      // Load index.js from the canister and execute it.
      await _loadJs(canisterId, 'index.js', async () => {
        const progress = document.getElementById('ic-progress');
        if (progress) progress.remove();
      });
    }
  }
}

_main().catch(err => {
  bootstrapLog('error', 'caught error', { error: err });
  const div = document.createElement('div');
  div.innerText = 'An error happened:';
  const pre = document.createElement('pre');
  pre.innerHTML = err.stack;
  div.appendChild(pre);
  app.render(div);
  throw err;
});

/** Log something using globalThis.console, if present */
function log(level: keyof typeof console, ...loggables: any[]) {
  if (typeof console[level] === 'function') {
    console[level](...loggables);
    return;
  }
  if (level !== 'info') {
    log('info', level, ...loggables);
  }
  if (typeof console?.log === 'function') {
    console.log(...loggables);
  }
}

function makeLog(name: string): typeof log {
  return (level: keyof typeof console, ...loggables: any[]) => {
    log(level, `[${name}]`, ...loggables);
  };
}

async function MutableIdentity(
  identities: AsyncIterable<SignIdentity | AnonymousIdentity>,
): Promise<SignIdentity | AnonymousIdentity> {
  makeLog('MutableIdentity')('debug', 'constructing MutableIdentity', identities);
  const initialIdentity = new AnonymousIdentity();
  let identity: AnonymousIdentity | SignIdentity = initialIdentity;
  (async function () {
    for await (const nextIdentity of identities) {
      identity = nextIdentity;
      makeLog('MutableIdentity')('debug', 'using newly generated identity: ', identity);
    }
  })();
  const identityProxy: SignIdentity | AnonymousIdentity = new Proxy(initialIdentity, {
    get(target, prop, receiver) {
      const currentIdentity = target || identity;
      return Reflect.get(currentIdentity, prop, receiver);
    },
  });
  return identityProxy;
}

function withIdentity(identity: Identity) {
  return (info: SiteInfo): SiteInfo => {
    return Object.assign(Object.create(info), {
      identity,
    });
  };
}

function AuthenticationResponseDetectedEvents(
  spec: Pick<Document, 'addEventListener'>,
): AsyncIterable<Event> {
  const idChangedEventName =
    'https://internetcomputer.org/ns/authentication/AuthenticationResponseDetectedEvent';
  const events: AsyncIterable<Event> = (async function* () {
    while (true) {
      const nextEvent = await new Promise<Event>((resolve, reject) => {
        spec.addEventListener(idChangedEventName, resolve, { once: true });
      });
      yield nextEvent;
    }
  })();
  return events;
}

function DocumentIdentities(document: Document) {
  const identities: AsyncIterable<SignIdentity | AnonymousIdentity> = (async function* () {
    // Start anonymous
    yield new AnonymousIdentity();
    // Wait for AuthenticationResponseDetectedEvents
    for await (const event of AuthenticationResponseDetectedEvents(document)) {
      if (!(event instanceof CustomEvent)) {
        idActorLog('warn', 'got unexpected event that is not a CustomEvent', { event });
        continue;
      }
      const url = event.detail.url;
      if (!(url instanceof URL)) {
        idActorLog('warn', 'got CustomEvent without URL', { event });
        continue;
      }
      const identity = (() => {
        const response = icidResponse.fromQueryString(url.searchParams);
        const chain = DelegationChain.fromJSON(icidResponse.parseBearerToken(response.accessToken));
        const sessionIdentity = Ed25519KeyIdentity.generate();
        const delegationIdentity = DelegationIdentity.fromDelegation(sessionIdentity, chain);
        console.log('DocumentIdentities created delegationIdentity', {
          publicKey: delegationIdentity.getPublicKey().toDer().toString('hex'),
        });
        return delegationIdentity;
      })();
      yield identity;
    }
  })();
  return identities;
}
