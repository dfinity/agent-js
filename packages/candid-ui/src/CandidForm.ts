/* eslint-disable no-empty */
import {
  Actor,
  ActorSubclass,
  Agent,
  AnonymousIdentity,
  CanisterStatus,
  HttpAgent,
  Identity,
} from '@dfinity/agent';
import { IDL } from '@dfinity/candid';
import { Principal } from '@dfinity/principal';
import { log, renderMethod } from './renderMethod';
import { IdbNetworkIds } from './db';
import { styles } from './styles';
import { html } from './utils';
import { ECDSAKeyIdentity } from '@dfinity/identity';
import type { CanisterIdInput } from './CanisterIdInput';

if (!('global' in window)) {
  (window as any).global = window;
}

class AnonymousAgent extends HttpAgent {}

ECDSAKeyIdentity.generate().then(identity => {
  window.testIdentity = identity;
});

export class CandidForm extends HTMLElement {
  #identity?: Identity = new AnonymousIdentity();
  #db?: IdbNetworkIds;
  #agent: HttpAgent;
  #canisterId?: Principal;
  #isLocal = false;
  #host?: string;
  #title = 'Candid UI';
  #description = 'Browse and test your API with our visual web interface.';

  constructor() {
    super();

    // shadow DOM
    const shadow = this.attachShadow({ mode: 'open' });

    const styleTag = document.createElement('style');
    styleTag.innerHTML = styles;
    shadow.appendChild(styleTag);

    const main = document.createElement('main');
    main.id = 'main';
    shadow.appendChild(main);

    //  create a database
    IdbNetworkIds.create().then(db => {
      this.#db = db;
    });

    // default to anonymous
    this.#agent = new AnonymousAgent({ host: this.#host });
  }

  //#region Properties
  /**
   * Public Interface
   */
  attributeChangedCallback() {
    console.log('attribute changed');
    this.#init();
  }

  // Values that can be set via attribute
  static get observedAttributes() {
    return ['canisterid', 'host', 'title', 'description'];
  }
  /**
   * setter for host
   */
  set host(host: string | undefined) {
    if (typeof host === 'string') {
      this.#host = host;
      this.setAttribute('host', host);
      this.#init();
    } else {
      if (typeof host === 'undefined') {
        this.removeAttribute('host');
        this.#init();
      } else {
        throw new Error('host must be a string or undefined');
      }
    }
  }

  get host() {
    return this.#host;
  }

  set title(title: string) {
    if (typeof title === 'string') {
      this.#title = title;
      this.setAttribute('title', title);
      this.#render();
    } else {
      throw new Error('title must be a string');
    }
  }

  get title() {
    return this.#title;
  }

  set description(description: string) {
    if (typeof description === 'string') {
      this.#description = description;
      this.setAttribute('description', description);
      this.#render();
    } else {
      throw new Error('description must be a string');
    }
  }

  get description() {
    return this.#description;
  }

  /**
   * functional setter method for canister id for Candid UI to display
   * @param canisterId - canister id
   */
  public setCanisterId(canisterId?: Principal | string): void {
    if (canisterId) {
      this.#canisterId = Principal.from(canisterId);
      this.setAttribute('canisterid', canisterId.toString());
    } else {
      this.#canisterId = undefined;
      this.removeAttribute('canisterid');
    }
    this.#render();
  }

  /**
   * The canister id for Candid UI to display
   */
  set canisterId(canisterId: Principal | string | undefined) {
    this.setCanisterId(canisterId);
  }

  get canisterId() {
    return this.#canisterId?.toString() ?? '';
  }

  /**
   * Setter method for an agent
   * @param agent - an instance of HttpAgent or Agent
   */
  public async setAgent(agent: Agent | HttpAgent) {
    this.#agent = agent as HttpAgent;
    if (this.#isLocal) {
      await this.#agent.fetchRootKey();
    }
  }

  set agent(agent: Agent | HttpAgent) {
    this.setAgent(agent);
  }

  get agent() {
    if (this.#agent) {
      return this.#agent;
    }
    if (this.#identity) {
      return new HttpAgent({ identity: this.#identity });
    }
    return new AnonymousAgent();
  }

  public async setIdentity(identity: Identity | undefined) {
    this.#identity = identity;
    this.setAgent(await this.#determineAgent(true));
    this.#init();
  }

  set identity(identity: Identity | undefined) {
    this.setIdentity(identity);
  }

  get identity() {
    return this.#identity;
  }

  //#endregion

  /**
   * Reset Candid UI
   */
  public reset = () => {
    this.#db?.clear();
    this.canisterId = undefined;
    this.setAttribute('canisterid', '');
    this.host = undefined;
    this.#determineHost().then(host => {
      this.agent = new AnonymousAgent({ host: host });
    });
    const container = this.shadowRoot?.querySelector('#container');
    if (container) {
      container.innerHTML = '';
    }
    this.#init();
  };

  /**
   * Private Methods
   */

  //   when the custom element is added to the DOM, the connectedCallback() method is called
  async connectedCallback() {
    await this.#init();
  }

  async #init() {
    // check if canister id is provided
    if (this.hasAttribute('canisterId')) {
      const canisterId = this.getAttribute('canisterId')?.trim();
      if (canisterId) {
        this.#canisterId = Principal.fromText(canisterId);
      }
    }
    if (this.hasAttribute('host')) {
      this.#host = this.getAttribute('host') ?? undefined;
    }
    const host = await this.#determineHost();
    if (this.#identity) {
      await this.setAgent(
        new HttpAgent({
          host: host,
          identity: this.#identity,
        }),
      );
    } else {
      await this.setAgent(
        new AnonymousAgent({
          host: host,
        }),
      );
    }
    this.#host = host;
    this.#isLocal = this.#determineLocal(this.#host);

    if (this.#isLocal) {
      await this.#agent.fetchRootKey();
    }
    const { defineCanisterIdInput } = await import('./CanisterIdInput');
    defineCanisterIdInput();
    await this.#render();
  }

  #determineLocal(host?: string) {
    if (host && !host.includes('localhost') && !host.includes('127.0.0.1')) {
      // set isLocal to false if host is not localhost
      return false;
    } else if (host && location) {
      // otherwise infer from location
      return location.href.includes('localhost') || location.href.includes('127.0.0.1');
    }

    return false;
  }

  #determineHost = async (): Promise<string> => {
    if (this.#host) return this.#host;
    let host = '';

    if (location.href.includes('localhost') || location.href.includes('127.0.0.1')) {
      try {
        const proxyResponse = await (await fetch('/api/v2')).text();
        if (proxyResponse.startsWith('Unexpected GET')) {
          host = location.origin;
        }
      } catch (_) {}
      try {
        const defaultLocalResponse = await (await fetch('http://127.0.0.1:4943/api/v2')).text();
        if (defaultLocalResponse.startsWith('Unexpected GET')) {
          host = `http://127.0.0.1:4943`;
        }
      } catch (_) {}
      try {
        const systemLocalResponse = await (await fetch('http://127.0.0.1:8080/api/v2')).text();

        if (systemLocalResponse.startsWith('Unexpected GET')) {
          host = `http://127.0.0.1:8080`;
        }
      } catch (_) {}
    }
    if (host) {
      console.log('inferred local host: ', host);
    } else {
      console.log('defaulting to https://icp-api.io host');
    }
    return host || `https://icp-api.io`;
  };

  #determineAgent = async (shouldReset = false): Promise<HttpAgent> => {
    if (this.#agent && !shouldReset) return this.#agent;
    let agent;
    if (this.#identity) {
      agent = new HttpAgent({
        identity: this.#identity,
        host: this.#host ?? (await this.#determineHost()),
      });
    } else {
      agent = new AnonymousAgent({
        host: this.#host ?? (await this.#determineHost()),
      });
    }

    if (this.#isLocal) {
      await agent.fetchRootKey();
    }
    return agent;
  };

  #render = async () => {
    console.count('render');
    this.#renderStatic();
    const agent = await this.#determineAgent();

    if (!this.#canisterId) return;
    let candid = await this.#db?.get(
      JSON.stringify({ id: this.#canisterId.toText(), network: this.#host }),
    );

    //   fetch the candid file
    try {
      if (!candid) {
        const status = await CanisterStatus.request({
          canisterId: this.#canisterId,
          agent,
          paths: ['candid'],
        });
        candid = status.get('candid') as string | undefined;
      }
      if (!candid) {
        candid = await this.#getDidJsFromTmpHack(this.#canisterId);
      }
      if (!candid) {
        console.error('Candid file not found');
        return;
      }

      //   save candid file to db
      if (this.#db) {
        this.#db.set(
          JSON.stringify({ id: this.#canisterId.toText(), network: this.#host }),
          candid,
        );
      }

      // profile time this call takes
      console.time('didToJs');
      const js = await this.#didToJs(candid as string);
      console.timeEnd('didToJs');

      if (!js) {
        throw new Error('Cannot fetch candid file');
      }
      const dataUri = 'data:text/javascript;charset=utf-8,' + encodeURIComponent(js);
      const candidScript: any = await eval('import("' + dataUri + '")');
      const actor = Actor.createActor(candidScript.idlFactory, {
        agent: this.#agent,
        canisterId: this.#canisterId,
      });
      const sortedMethods = Actor.interfaceOf(actor)._fields.sort(([a], [b]) => (a > b ? 1 : -1));

      const shadowRoot = this.shadowRoot!;

      for (const [name, func] of sortedMethods) {
        renderMethod(actor, name, func, shadowRoot, async () => undefined);
      }
    } catch (e: unknown) {
      console.error(e);
      log((e as Error).message, this.shadowRoot!);
      // return this.renderCanisterIdInput(e as string);
    }
  };

  #renderStatic = () => {
    const shadowRoot = this.shadowRoot!;
    const main = shadowRoot.getElementById('main');
    if (main) {
      main.innerHTML = html`<link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/bootstrap-reboot@4.5.4/reboot.css"
        />
        <link rel="preconnect" href="https://fonts.gstatic.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;500&display=swap"
          rel="stylesheet"
        />
        <link
          rel="stylesheet"
          type="text/css"
          href="https://cdn.jsdelivr.net/npm/d3-flame-graph@4.1.3/dist/d3-flamegraph.css"
        />
        <style>
          .ic_progress {
            display: block;
            margin: 50vh auto;
            width: 25vw;
          }
        </style>
        <div id="progress">
          <progress class="ic_progress" id="ic-progress">Loading Candid UI...</progress>
        </div>
        <section id="app" style="display: none">
          <header id="header">
            <div></div>
            <canister-input></canister-input>
            <button type="reset" id="reset-button">reset</button>
          </header>
          <div id="container">
            <div id="main-content">
              <div id="title-card">
                <h1 id="title">${this.#title}</h1>
                ${this.#description}
              </div>
              <ul id="methods"></ul>
            </div>
            <div id="console">
              <div id="console-bar">
                <button id="output-button">
                  <svg
                    viewBox="64 64 896 896"
                    focusable="false"
                    data-icon="clock-circle"
                    width="1em"
                    height="1em"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      d="M512 64C264.6 64 64 264.6 64 512s200.6 448 448 448 448-200.6 448-448S759.4 64 512 64zm0 820c-205.4 0-372-166.6-372-372s166.6-372 372-372 372 166.6 372 372-166.6 372-372 372z"
                    ></path>
                    <path
                      d="M686.7 638.6L544.1 535.5V288c0-4.4-3.6-8-8-8H488c-4.4 0-8 3.6-8 8v275.4c0 2.6 1.2 5 3.3 6.5l165.4 120.6c3.6 2.6 8.6 1.8 11.2-1.7l28.6-39c2.6-3.7 1.8-8.7-1.8-11.2z"
                    ></path>
                  </svg>
                </button>
                <button id="methods-button">
                  <svg
                    viewBox="64 64 896 896"
                    focusable="false"
                    data-icon="unordered-list"
                    width="1em"
                    height="1em"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      d="M912 192H328c-4.4 0-8 3.6-8 8v56c0 4.4 3.6 8 8 8h584c4.4 0 8-3.6 8-8v-56c0-4.4-3.6-8-8-8zm0 284H328c-4.4 0-8 3.6-8 8v56c0 4.4 3.6 8 8 8h584c4.4 0 8-3.6 8-8v-56c0-4.4-3.6-8-8-8zm0 284H328c-4.4 0-8 3.6-8 8v56c0 4.4 3.6 8 8 8h584c4.4 0 8-3.6 8-8v-56c0-4.4-3.6-8-8-8zM104 228a56 56 0 10112 0 56 56 0 10-112 0zm0 284a56 56 0 10112 0 56 56 0 10-112 0zm0 284a56 56 0 10112 0 56 56 0 10-112 0z"
                    ></path>
                  </svg>
                </button>
              </div>
              <div id="output-pane">
                <div class="console-header">Output Log</div>
                <div id="output-list"></div>
              </div>
              <div id="methods-pane" style="display: none">
                <div class="console-header">Methods</div>
                <ul id="methods-list"></ul>
              </div>
            </div>
          </div>
        </section>`;
    }
    this.#initializeConsoleControls();
  };

  #getDidJsFromTmpHack = async (canisterId: Principal) => {
    const common_interface: IDL.InterfaceFactory = ({ IDL }) =>
      IDL.Service({
        __get_candid_interface_tmp_hack: IDL.Func([], [IDL.Text], ['query']),
      });
    const actor: ActorSubclass = Actor.createActor(common_interface, {
      agent: this.#agent,
      canisterId,
    });
    const candid_source = (await actor.__get_candid_interface_tmp_hack()) as string;
    console.log(candid_source);
    return candid_source;
  };

  #didToJs = async (candid_source: string) => {
    // call didjs canister
    const didjs_interface: IDL.InterfaceFactory = ({ IDL }) =>
      IDL.Service({
        did_to_js: IDL.Func([IDL.Text], [IDL.Opt(IDL.Text)], ['query']),
      });

    const candidCanister = this.#isLocal
      ? `ryjl3-tyaaa-aaaaa-aaaba-cai`
      : `a4gq6-oaaaa-aaaab-qaa4q-cai`;

    console.log('candidCanister: ', candidCanister);
    const didjs: ActorSubclass = Actor.createActor(didjs_interface, {
      agent: this.#agent,
      canisterId: candidCanister,
    });
    const js: any = await didjs.did_to_js(candid_source);
    if (Array.isArray(js) && js.length === 0) {
      return undefined;
    }
    return js[0];
  };

  #initializeConsoleControls() {
    const consoleEl = this.shadowRoot?.getElementById('console') as HTMLDivElement;
    const outputButton = this.shadowRoot?.getElementById('output-button') as HTMLButtonElement;
    const methodsButton = this.shadowRoot?.getElementById('methods-button') as HTMLButtonElement;
    const resetButton = this.shadowRoot?.getElementById('reset-button') as HTMLButtonElement;

    const outputPane = this.shadowRoot?.getElementById('output-pane') as HTMLDivElement;
    const methodsPane = this.shadowRoot?.getElementById('methods-pane') as HTMLDivElement;

    const buttons: HTMLButtonElement[] = [outputButton, methodsButton];
    const panes: HTMLDivElement[] = [outputPane, methodsPane];

    const app = this.shadowRoot?.getElementById('app');
    const progress = this.shadowRoot?.getElementById('progress');

    // Set canister ID in the header
    const canisterIdInput = this.shadowRoot?.querySelector('canister-input') as CanisterIdInput;

    if (this.#canisterId) {
      canisterIdInput.setAttribute('canisterid', this.#canisterId.toText());
    }
    const handleChange = (id?: Principal) => {
      console.count('outer handleChange');
      if (id) {
        this.setCanisterId(id);
      }
    };
    canisterIdInput.onChange = handleChange.bind(this);

    function openConsole() {
      if (!consoleEl.classList.contains('open')) {
        consoleEl.classList.add('open');
      }
    }
    function toggleConsole() {
      if (consoleEl.classList.contains('open')) {
        consoleEl.classList.remove('open');
        buttons.forEach(button => {
          button.classList.remove('active-tab');
          button.blur();
        });
        panes.forEach(pane => {
          pane.style.display = 'none';
        });
      } else {
        consoleEl.classList.add('open');
      }
    }
    outputButton.addEventListener('click', () => {
      if (outputButton.classList.contains('active-tab')) {
        toggleConsole();
      } else {
        openConsole();
        outputPane.style.display = 'block';
        outputButton.classList.add('active-tab');
        methodsPane.style.display = 'none';
        methodsButton.classList.remove('active-tab');
      }
    });
    methodsButton.addEventListener('click', () => {
      if (methodsButton.classList.contains('active-tab')) {
        toggleConsole();
      } else {
        openConsole();
        methodsPane.style.display = 'block';
        methodsButton.classList.add('active-tab');
        outputPane.style.display = 'none';
        outputButton.classList.remove('active-tab');
      }
    });
    resetButton.addEventListener('click', () => {
      this.reset();
    });
    progress!.remove();
    app!.style.display = 'block';
    outputButton.click();
  }
}

/**
 * Define the custom element
 */
export function defineCandidFormElement() {
  if (!window.customElements.get('candid-form')) {
    customElements.define('candid-form', CandidForm);
  } else {
    console.warn('candid-form already defined');
  }
}
