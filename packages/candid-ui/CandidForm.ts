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

export class CandidForm extends HTMLElement {
  private _service?: IDL.ServiceClass;
  private _identity?: Identity = new AnonymousIdentity();
  private _db?: IdbKeyVal;
  private _agent?: HttpAgent;
  private _canisterId?: Principal;
  private _isLocal: boolean;
  private _host?: string;

  constructor() {
    super();
    this._isLocal = location.href.includes('localhost') || location.href.includes('127.0.0.1');
    // shadow DOM
    const shadow = this.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = `
        :host {
            display: block;
            width: 100%;
            height: 100%;
        }
        .container {
            display: flex;
            flex-flow: row wrap;
            height: 100%;
        }
        .container ul {
            list-style: none;
            all: unset;
            display: flex;
            flex-direction: column;
            gap: 1rem;
        }
        .container li {
            list-style: none;
            display: flex;
            flex-direction: column;
            gap: 1rem;
        }
        #methods-list {
          display: none;
        }
        #methods, #output-list {
          min-height: 200px;
          padding: 1rem;
        }
        #methods {
          flex: 3;
          min-width: 600px;
          @media (min-width: 800px) {
            max-width: 70vw;
          }
        }
        #output-list {
          
          flex: 1;
        }
        pre, code, .signature {
          white-space: pre-line;
          font-family: Source Code Pro,monospace;
          font-size: 14px;
          line-height: 1.5;
          color: #333;
        }
        .split-panel {
          --min: 150px;
          --max: calc(100% - 150px);
        }

    }`;

    const stylesheet = document.createElement('link');
    stylesheet.rel = 'stylesheet';
    stylesheet.href = '/candid.css';
    shadow.appendChild(stylesheet);

    const stylesheet2 = document.createElement('link');
    stylesheet2.rel = 'stylesheet';
    stylesheet2.href =
      '<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-reboot@4.5.4/reboot.css">';
    shadow.appendChild(stylesheet2);

    const container = document.createElement('div');
    container.className = 'container';
    shadow.appendChild(container);

    const methodsList = document.createElement('ul');
    methodsList.id = 'methods-list';
    container.appendChild(methodsList);

    const methods = document.createElement('div');
    methods.className = 'methods';
    methods.id = 'methods';
    methods.slot = 'start';
    container.appendChild(methods);

    const ouputList = document.createElement('ul');
    ouputList.id = 'output-list';
    ouputList.slot = 'end';
    const ouputListTitle = document.createElement('h3');
    ouputListTitle.textContent = 'Output Log';
    ouputList.appendChild(ouputListTitle);
    container.appendChild(ouputList);

    container.appendChild(style);

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
    }

    await this.render();
    this.loadComponents();
  }

  loadComponents = async () => {
    import('@shoelace-style/shoelace/dist/components/button/button.js');
    import('@shoelace-style/shoelace/dist/components/icon/icon.js');
    import('@shoelace-style/shoelace/dist/components/split-panel/split-panel.js');
    import('@shoelace-style/shoelace/dist/components/input/input.js');
    import('@shoelace-style/shoelace/dist/components/details/details.js');
  };

  set canisterId(canisterId: Principal) {
    this._canisterId = canisterId;
    this.render();
  }

  render = async () => {
    console.log('render');
    if (!this._canisterId) {
      return;
    }
    this._agent = new HttpAgent({
      identity: this._identity,
      host: 'https://icp-api.io',
      //   host: this._host ?? this._isLocal ? 'http://localhost:8000' : 'https://icp-api.io',
    });
    let candid = await this._db?.get(this._canisterId.toText());

    //   fetch the candid file
    if (!candid) {
      const status = await CanisterStatus.request({
        canisterId: this._canisterId,
        agent: this._agent,
        paths: ['candid'],
      });
      candid = status.get('candid') as string | undefined;
    }
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

    const shadowRoot = this.shadowRoot!;
    for (const [name, func] of sortedMethods) {
      renderMethod(actor, name, func, shadowRoot, async () => undefined);
    }
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
