// create a custom web component
import {
  Actor,
  ActorSubclass,
  AnonymousIdentity,
  CanisterStatus,
  HttpAgent,
  Identity,
} from '@dfinity/agent';
import { IDL } from '@dfinity/candid';
import { Principal } from '@dfinity/principal';
import { renderMethod } from './renderMethod.js';
import { IdbKeyVal } from './db.js';

import '@shoelace-style/shoelace/dist/themes/light.css';
import '@shoelace-style/shoelace/dist/themes/dark.css';

(window as any).global = window;

export type CandidFormOptions = {
  canisterId?: Principal;
  host?: string;
  identity?: Identity;
  title?: string;
  description?: string;
};

export class CandidForm extends HTMLElement {
  private _service?: IDL.ServiceClass;
  private _identity?: Identity = new AnonymousIdentity();
  private _db?: IdbKeyVal;
  private _agent?: HttpAgent;
  private _canisterId?: Principal;
  private _isLocal: boolean;
  private _host?: string;
  private _title?: string = 'Candid UI';
  private _description?: string = 'Browse and test your API with our visual web interface.';

  constructor(options?: CandidFormOptions) {
    super();
    this._isLocal = location.href.includes('localhost') || location.href.includes('127.0.0.1');
    this._canisterId = options?.canisterId;
    this._host = options?.host;
    this._identity = options?.identity;
    this._title = options?.title;
    this._description = options?.description;

    // shadow DOM
    const shadow = this.attachShadow({ mode: 'open' });

    const stylesheet = document.createElement('link');
    stylesheet.rel = 'stylesheet';
    stylesheet.href = '/candid.css';
    shadow.appendChild(stylesheet);

    const main = document.createElement('main');
    main.id = 'main';
    shadow.appendChild(main);

    //  create a database
    IdbKeyVal.create().then(db => {
      this._db = db;
    });
  }

  //   when the custom element is added to the DOM, the connectedCallback() method is called
  async connectedCallback() {
    console.log('connectedCallback');
    // check if canister id is provided
    if (this.hasAttribute('canisterId')) {
      const canisterId = this.getAttribute('canisterId')?.trim();
      if (canisterId) {
        this._canisterId = Principal.fromText(canisterId);
      }
    }

    if (this.hasAttribute('host')) {
      this._host = this.getAttribute('host')!;
    } else {
      this._host = this._isLocal ? undefined : 'https://icp-api.io';
    }

    await this.render();
  }

  set canisterId(canisterId: Principal) {
    this._canisterId = canisterId;
    this.render();
  }

  render = async () => {
    const shadowRoot = this.shadowRoot!;
    const main = shadowRoot.querySelector('main') as HTMLDivElement;
    main.innerHTML = '';

    if (!this._canisterId) {
      return this.renderCanisterIdInput();
    }
    this.renderStatic();
    this._agent = new HttpAgent({
      identity: this._identity,
      host: this._host,
      //   host: this._host ?? this._isLocal ? 'http://localhost:8000' : 'https://icp-api.io',
    });
    let candid = await this._db?.get(this._canisterId.toText());

    //   fetch the candid file
    try {
      if (!candid) {
        const status = await CanisterStatus.request({
          canisterId: this._canisterId,
          agent: this._agent,
          paths: ['candid'],
        });
        candid = status.get('candid') as string | undefined;
      }
      console.log('candid', candid);
      if (!candid) {
        candid = await this.getDidJsFromTmpHack(this._canisterId);
      }
      if (!candid) {
        console.error('Candid file not found');
        return;
      }

      //   save candid file to db
      if (this._db) {
        this._db.set(this._canisterId.toText(), candid);
      }

      // profile time this call takes
      console.time('didToJs');
      const js = await this.didToJs(candid as string);
      console.timeEnd('didToJs');

      if (!js) {
        throw new Error('Cannot fetch candid file');
      }
      const dataUri = 'data:text/javascript;charset=utf-8,' + encodeURIComponent(js);
      const candidScript: any = await eval('import("' + dataUri + '")');
      const actor = Actor.createActor(candidScript.idlFactory, {
        agent: this._agent,
        canisterId: this._canisterId,
      });
      const sortedMethods = Actor.interfaceOf(actor)._fields.sort(([a], [b]) => (a > b ? 1 : -1));

      for (const [name, func] of sortedMethods) {
        renderMethod(actor, name, func, shadowRoot, async () => undefined);
      }

      const ouputListTitle = document.createElement('h3');
      ouputListTitle.textContent = 'Output Log';
      const outputList = shadowRoot.getElementById('output-list');
      outputList?.appendChild(ouputListTitle);
    } catch (e) {
      console.error(e);
      return this.renderCanisterIdInput(e as string);
    }
  };

  renderStatic = () => {
    const shadowRoot = this.shadowRoot!;
    const main = shadowRoot.getElementById('main');
    if (main) {
      main.innerHTML = `
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-reboot@4.5.4/reboot.css" />
    <link rel="preconnect" href="https://fonts.gstatic.com" />
    <link
      href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;500&display=swap"
      rel="stylesheet"
    />
    <link rel="stylesheet" type="text/css" href="https://cdn.jsdelivr.net/npm/d3-flame-graph@4.1.3/dist/d3-flamegraph.css">
    <style>.ic_progress { display: block; margin: 50vh auto; width: 25vw; }</style>
      <div id="progress">
      <progress class="ic_progress" id="ic-progress">Loading Candid UI...</progress>
    </div>
    <app id="app" style="display: none">
      <div id="header">Canister ID:&nbsp;<span id="canisterId"></span></div>
      <div id="container">
        <div id="main-content">
          <div id="title-card">
            <h1 id="title">Candid UI</h1>
            Browse and test your API with our visual web interface.
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
    </app>
    <script type="text/javascript" src="https://d3js.org/d3.v7.js"></script>
    <script type="text/javascript" src="https://cdn.jsdelivr.net/npm/d3-flame-graph@4.1.3/dist/d3-flamegraph.min.js"></script>
    <script type="text/javascript" src="https://cdn.jsdelivr.net/npm/d3-flame-graph@4.1.3/dist/d3-flamegraph-tooltip.min.js"></script>`;
    }
    this.initializeConsoleControls();
  };

  renderCanisterIdInput = (error?: string) => {
    if (this.shadowRoot?.querySelector('.form') !== null) return;

    const shadowRoot = this.shadowRoot!;

    const form = document.createElement('form');
    form.className = 'form';
    form.style.width = '650px';
    shadowRoot.prepend(form);

    const title = document.createElement('h3');
    title.textContent = 'Enter canister ID';
    form.appendChild(title);

    const canisterIdInput = document.createElement('input');

    canisterIdInput.addEventListener('change', () => {
      try {
        const canisterId = Principal.fromText(canisterIdInput.value);
        canisterIdInput.setCustomValidity('');
      } catch (error) {
        canisterIdInput.setCustomValidity('Please enter a valid canister ID.');
      }
    });

    form.appendChild(canisterIdInput);

    if (error) {
      const errorDiv = document.createElement('div');
      errorDiv.textContent = error;
      errorDiv.style.color = 'red';
      form.appendChild(errorDiv);
    }

    const button = document.createElement('button');
    button.textContent = 'Submit';
    button.type = 'submit';
    form.appendChild(button);

    form.addEventListener('submit', e => {
      e.preventDefault();
      const canisterId = canisterIdInput.value;
      this._canisterId = Principal.fromText(canisterId);
      this.render();
      return false;
    });
  };

  getDidJsFromTmpHack = async (canisterId: Principal) => {
    const common_interface: IDL.InterfaceFactory = ({ IDL }) =>
      IDL.Service({
        __get_candid_interface_tmp_hack: IDL.Func([], [IDL.Text], ['query']),
      });
    const actor: ActorSubclass = Actor.createActor(common_interface, {
      agent: this._agent,
      canisterId,
    });
    const candid_source = (await actor.__get_candid_interface_tmp_hack()) as string;
    return candid_source;
  };

  didToJs = async (candid_source: string) => {
    // call didjs canister
    const didjs_interface: IDL.InterfaceFactory = ({ IDL }) =>
      IDL.Service({
        did_to_js: IDL.Func([IDL.Text], [IDL.Opt(IDL.Text)], ['query']),
      });
    const didjs: ActorSubclass = Actor.createActor(didjs_interface, {
      agent: this._agent,
      canisterId: 'a4gq6-oaaaa-aaaab-qaa4q-cai',
    });
    const js: any = await didjs.did_to_js(candid_source);
    if (Array.isArray(js) && js.length === 0) {
      return undefined;
    }
    return js[0];
  };

  initializeConsoleControls() {
    const consoleEl = this.shadowRoot?.getElementById('console') as HTMLDivElement;
    const outputButton = this.shadowRoot?.getElementById('output-button') as HTMLButtonElement;
    const methodsButton = this.shadowRoot?.getElementById('methods-button') as HTMLButtonElement;

    const outputPane = this.shadowRoot?.getElementById('output-pane') as HTMLDivElement;
    const methodsPane = this.shadowRoot?.getElementById('methods-pane') as HTMLDivElement;

    const buttons: HTMLButtonElement[] = [outputButton, methodsButton];
    const panes: HTMLDivElement[] = [outputPane, methodsPane];

    const app = this.shadowRoot?.getElementById('app');
    const progress = this.shadowRoot?.getElementById('progress');

    // Set canister ID in the header
    const canisterIdSpan = this.shadowRoot?.getElementById('canisterId') as HTMLSpanElement;

    if (this._canisterId) {
      canisterIdSpan.textContent = this._canisterId.toText();
    }

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
