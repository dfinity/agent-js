var __classPrivateFieldSet =
  (this && this.__classPrivateFieldSet) ||
  function (receiver, state, value, kind, f) {
    if (kind === 'm') throw new TypeError('Private method is not writable');
    if (kind === 'a' && !f) throw new TypeError('Private accessor was defined without a setter');
    if (typeof state === 'function' ? receiver !== state || !f : !state.has(receiver))
      throw new TypeError(
        'Cannot write private member to an object whose class did not declare it',
      );
    return (
      kind === 'a' ? f.call(receiver, value) : f ? (f.value = value) : state.set(receiver, value),
      value
    );
  };
var __classPrivateFieldGet =
  (this && this.__classPrivateFieldGet) ||
  function (receiver, state, kind, f) {
    if (kind === 'a' && !f) throw new TypeError('Private accessor was defined without a getter');
    if (typeof state === 'function' ? receiver !== state || !f : !state.has(receiver))
      throw new TypeError(
        'Cannot read private member from an object whose class did not declare it',
      );
    return kind === 'm' ? f : kind === 'a' ? f.call(receiver) : f ? f.value : state.get(receiver);
  };
var _CandidForm_instances,
  _CandidForm_identity,
  _CandidForm_db,
  _CandidForm_agent,
  _CandidForm_canisterId,
  _CandidForm_isLocal,
  _CandidForm_host,
  _CandidForm_title,
  _CandidForm_description,
  _CandidForm_methods,
  _CandidForm_isInitialized,
  _CandidForm_processStyles,
  _CandidForm_init,
  _CandidForm_determineLocal,
  _CandidForm_determineHost,
  _CandidForm_determineAgent,
  _CandidForm_render,
  _CandidForm_renderStatic,
  _CandidForm_getDidJsFromTmpHack,
  _CandidForm_didToJs,
  _CandidForm_initializeConsoleControls;
/* eslint-disable no-empty */
import { Actor, AnonymousIdentity, CanisterStatus, HttpAgent } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { log, renderMethod } from './renderMethod';
import { IdbNetworkIds } from './db';
import { styles } from './styles';
import { html } from './utils';
if (!('global' in window)) {
  window.global = window;
}
class AnonymousAgent extends HttpAgent {}
export class CandidForm extends HTMLElement {
  constructor() {
    super();
    _CandidForm_instances.add(this);
    _CandidForm_identity.set(this, new AnonymousIdentity());
    _CandidForm_db.set(this, void 0);
    _CandidForm_agent.set(this, void 0);
    _CandidForm_canisterId.set(this, void 0);
    _CandidForm_isLocal.set(this, false);
    _CandidForm_host.set(this, void 0);
    _CandidForm_title.set(this, 'Candid UI');
    _CandidForm_description.set(this, 'Browse and test your API with our visual web interface.');
    // restricted set of methods to display
    _CandidForm_methods.set(this, []);
    _CandidForm_isInitialized.set(this, false);
    //#endregion
    /**
     * Reset Candid UI
     */
    this.reset = () => {
      __classPrivateFieldGet(this, _CandidForm_db, 'f')?.clear();
      this.canisterId = undefined;
      this.setAttribute('canisterid', '');
      this.host = undefined;
      __classPrivateFieldGet(this, _CandidForm_determineHost, 'f')
        .call(this)
        .then(host => {
          this.agent = new AnonymousAgent({ host: host });
        });
      const container = this.shadowRoot?.querySelector('#container');
      if (container) {
        container.innerHTML = '';
      }
      __classPrivateFieldGet(this, _CandidForm_instances, 'm', _CandidForm_init).call(this);
    };
    /**
     * Private Methods
     */
    //   when the custom element is added to the DOM, the connectedCallback() method is called
    _CandidForm_processStyles.set(this, async slot => {
      slot.assignedNodes().forEach(node => {
        // copy the styles to the shadow DOM
        if (node instanceof HTMLStyleElement) {
          const styleTag = document.createElement('style');
          styleTag.innerHTML = node.innerHTML;
          this.shadowRoot?.appendChild(styleTag);
        }
        // remove the styles from the light DOM
        if (node instanceof HTMLStyleElement) {
          node.remove();
        }
      });
    });
    _CandidForm_determineHost.set(this, async () => {
      if (__classPrivateFieldGet(this, _CandidForm_host, 'f'))
        return __classPrivateFieldGet(this, _CandidForm_host, 'f');
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
    });
    _CandidForm_determineAgent.set(this, async (shouldReset = false) => {
      if (__classPrivateFieldGet(this, _CandidForm_agent, 'f') && !shouldReset)
        return __classPrivateFieldGet(this, _CandidForm_agent, 'f');
      let agent;
      if (__classPrivateFieldGet(this, _CandidForm_identity, 'f')) {
        agent = new HttpAgent({
          identity: __classPrivateFieldGet(this, _CandidForm_identity, 'f'),
          host:
            __classPrivateFieldGet(this, _CandidForm_host, 'f') ??
            (await __classPrivateFieldGet(this, _CandidForm_determineHost, 'f').call(this)),
        });
      } else {
        agent = new AnonymousAgent({
          host:
            __classPrivateFieldGet(this, _CandidForm_host, 'f') ??
            (await __classPrivateFieldGet(this, _CandidForm_determineHost, 'f').call(this)),
        });
      }
      if (__classPrivateFieldGet(this, _CandidForm_isLocal, 'f')) {
        await agent.fetchRootKey();
      }
      return agent;
    });
    _CandidForm_render.set(this, async () => {
      console.count('render');
      __classPrivateFieldGet(this, _CandidForm_renderStatic, 'f').call(this);
      const agent = await __classPrivateFieldGet(this, _CandidForm_determineAgent, 'f').call(this);
      if (!__classPrivateFieldGet(this, _CandidForm_canisterId, 'f')) return;
      let candid = await __classPrivateFieldGet(this, _CandidForm_db, 'f')?.get(
        JSON.stringify({
          id: __classPrivateFieldGet(this, _CandidForm_canisterId, 'f').toText(),
          network: __classPrivateFieldGet(this, _CandidForm_host, 'f'),
        }),
      );
      //   fetch the candid file
      try {
        if (!candid) {
          const status = await CanisterStatus.request({
            canisterId: __classPrivateFieldGet(this, _CandidForm_canisterId, 'f'),
            agent,
            paths: ['candid'],
          });
          candid = status.get('candid');
        }
        if (!candid) {
          candid = await __classPrivateFieldGet(this, _CandidForm_getDidJsFromTmpHack, 'f').call(
            this,
            __classPrivateFieldGet(this, _CandidForm_canisterId, 'f'),
          );
        }
        if (!candid) {
          console.error('Candid file not found');
          return;
        }
        //   save candid file to db
        if (__classPrivateFieldGet(this, _CandidForm_db, 'f')) {
          __classPrivateFieldGet(this, _CandidForm_db, 'f').set(
            JSON.stringify({
              id: __classPrivateFieldGet(this, _CandidForm_canisterId, 'f').toText(),
              network: __classPrivateFieldGet(this, _CandidForm_host, 'f'),
            }),
            candid,
          );
        }
        // profile time this call takes
        console.time('didToJs');
        const js = await __classPrivateFieldGet(this, _CandidForm_didToJs, 'f').call(this, candid);
        console.timeEnd('didToJs');
        if (!js) {
          throw new Error('Cannot fetch candid file');
        }
        const dataUri = 'data:text/javascript;charset=utf-8,' + encodeURIComponent(js);
        const candidScript = await eval('import("' + dataUri + '")');
        const actor = Actor.createActor(candidScript.idlFactory, {
          agent: __classPrivateFieldGet(this, _CandidForm_agent, 'f'),
          canisterId: __classPrivateFieldGet(this, _CandidForm_canisterId, 'f'),
        });
        const sortedMethods = Actor.interfaceOf(actor)._fields.sort(([a], [b]) => (a > b ? 1 : -1));
        const shadowRoot = this.shadowRoot;
        shadowRoot.querySelector('#methods').innerHTML = '';
        //  if methods are specified, only render those
        if (__classPrivateFieldGet(this, _CandidForm_methods, 'f')?.length) {
          const methods = sortedMethods.filter(([name]) =>
            __classPrivateFieldGet(this, _CandidForm_methods, 'f').includes(name),
          );
          // sort methods by this.#methods
          methods.sort(([a], [b]) => {
            const aIndex = __classPrivateFieldGet(this, _CandidForm_methods, 'f').indexOf(a);
            const bIndex = __classPrivateFieldGet(this, _CandidForm_methods, 'f').indexOf(b);
            return aIndex > bIndex ? 1 : -1;
          });
          for (const [name, func] of methods) {
            renderMethod(actor, name, func, shadowRoot, async () => undefined);
          }
          return;
        } else {
          __classPrivateFieldSet(
            this,
            _CandidForm_methods,
            sortedMethods.map(([name]) => name),
            'f',
          );
          for (const [name, func] of sortedMethods) {
            renderMethod(actor, name, func, shadowRoot, async () => undefined);
          }
        }
      } catch (e) {
        console.error(e);
        log(e.message, this.shadowRoot);
        // return this.renderCanisterIdInput(e as string);
      }
    });
    _CandidForm_renderStatic.set(this, () => {
      const shadowRoot = this.shadowRoot;
      const main = shadowRoot.getElementById('main');
      if (main) {
        const template = document.createElement('template');
        template.innerHTML = html`<link
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
          <slot name="styles"></slot>
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
                  <slot name="title">
                    <h1 id="title">${__classPrivateFieldGet(this, _CandidForm_title, 'f')}</h1>
                  </slot>
                  <slot name="description">
                    <p id="description">
                      ${__classPrivateFieldGet(this, _CandidForm_description, 'f')}
                    </p>
                  </slot>
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
        main?.appendChild(template.content.cloneNode(true));
      }
      __classPrivateFieldGet(
        this,
        _CandidForm_instances,
        'm',
        _CandidForm_initializeConsoleControls,
      ).call(this);
    });
    _CandidForm_getDidJsFromTmpHack.set(this, async canisterId => {
      const common_interface = ({ IDL }) =>
        IDL.Service({
          __get_candid_interface_tmp_hack: IDL.Func([], [IDL.Text], ['query']),
        });
      const actor = Actor.createActor(common_interface, {
        agent: __classPrivateFieldGet(this, _CandidForm_agent, 'f'),
        canisterId,
      });
      const candid_source = await actor.__get_candid_interface_tmp_hack();
      console.log(candid_source);
      return candid_source;
    });
    _CandidForm_didToJs.set(this, async candid_source => {
      // call didjs canister
      const didjs_interface = ({ IDL }) =>
        IDL.Service({
          did_to_js: IDL.Func([IDL.Text], [IDL.Opt(IDL.Text)], ['query']),
        });
      const candidCanister = __classPrivateFieldGet(this, _CandidForm_isLocal, 'f')
        ? `ryjl3-tyaaa-aaaaa-aaaba-cai`
        : `a4gq6-oaaaa-aaaab-qaa4q-cai`;
      console.log('candidCanister: ', candidCanister);
      const didjs = Actor.createActor(didjs_interface, {
        agent: __classPrivateFieldGet(this, _CandidForm_agent, 'f'),
        canisterId: candidCanister,
      });
      const js = await didjs.did_to_js(candid_source);
      if (Array.isArray(js) && js.length === 0) {
        return undefined;
      }
      return js[0];
    });
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
      __classPrivateFieldSet(this, _CandidForm_db, db, 'f');
    });
    // default to anonymous
    __classPrivateFieldSet(
      this,
      _CandidForm_agent,
      new AnonymousAgent({ host: __classPrivateFieldGet(this, _CandidForm_host, 'f') }),
      'f',
    );
  }
  //#region Properties
  /**
   * Public Interface
   */
  attributeChangedCallback() {
    console.trace('attribute changed');
    __classPrivateFieldGet(this, _CandidForm_instances, 'm', _CandidForm_init).call(this);
  }
  // Values that can be set via attribute
  static get observedAttributes() {
    return ['canisterid', 'host', 'title', 'description', 'methods'];
  }
  /**
   * setter for host
   */
  set host(host) {
    if (typeof host === 'string') {
      __classPrivateFieldSet(this, _CandidForm_host, host, 'f');
      this.setAttribute('host', host);
      __classPrivateFieldGet(this, _CandidForm_instances, 'm', _CandidForm_init).call(this);
    } else {
      if (typeof host === 'undefined') {
        this.removeAttribute('host');
        __classPrivateFieldGet(this, _CandidForm_instances, 'm', _CandidForm_init).call(this);
      } else {
        throw new Error('host must be a string or undefined');
      }
    }
  }
  get host() {
    return __classPrivateFieldGet(this, _CandidForm_host, 'f');
  }
  set title(title) {
    if (typeof title === 'string') {
      __classPrivateFieldSet(this, _CandidForm_title, title, 'f');
      this.setAttribute('title', title);
      __classPrivateFieldGet(this, _CandidForm_render, 'f').call(this);
    } else {
      throw new Error('title must be a string');
    }
  }
  get title() {
    return __classPrivateFieldGet(this, _CandidForm_title, 'f');
  }
  set description(description) {
    if (typeof description === 'string') {
      __classPrivateFieldSet(this, _CandidForm_description, description, 'f');
      this.setAttribute('description', description);
      __classPrivateFieldGet(this, _CandidForm_render, 'f').call(this);
    } else {
      throw new Error('description must be a string');
    }
  }
  get description() {
    return __classPrivateFieldGet(this, _CandidForm_description, 'f');
  }
  set methods(methods) {
    if (Array.isArray(methods)) {
      __classPrivateFieldSet(this, _CandidForm_methods, methods, 'f');
      this.setAttribute('methods', methods.join(','));
      __classPrivateFieldGet(this, _CandidForm_render, 'f').call(this);
    } else {
      throw new Error('methods must be an array of strings');
    }
  }
  get methods() {
    return __classPrivateFieldGet(this, _CandidForm_methods, 'f');
  }
  /**
   * functional setter method for canister id for Candid UI to display
   * @param canisterId - canister id
   */
  setCanisterId(canisterId) {
    if (canisterId) {
      __classPrivateFieldSet(this, _CandidForm_canisterId, Principal.from(canisterId), 'f');
      this.setAttribute('canisterid', canisterId.toString());
    } else {
      __classPrivateFieldSet(this, _CandidForm_canisterId, undefined, 'f');
      this.removeAttribute('canisterid');
    }
    __classPrivateFieldGet(this, _CandidForm_render, 'f').call(this);
  }
  /**
   * The canister id for Candid UI to display
   */
  set canisterId(canisterId) {
    this.setCanisterId(canisterId);
  }
  get canisterId() {
    return __classPrivateFieldGet(this, _CandidForm_canisterId, 'f')?.toString() ?? '';
  }
  /**
   * Setter method for an agent
   * @param agent - an instance of HttpAgent or Agent
   */
  async setAgent(agent) {
    __classPrivateFieldSet(this, _CandidForm_agent, agent, 'f');
    if (__classPrivateFieldGet(this, _CandidForm_isLocal, 'f')) {
      await __classPrivateFieldGet(this, _CandidForm_agent, 'f').fetchRootKey();
    }
  }
  set agent(agent) {
    this.setAgent(agent);
  }
  get agent() {
    if (__classPrivateFieldGet(this, _CandidForm_agent, 'f')) {
      return __classPrivateFieldGet(this, _CandidForm_agent, 'f');
    }
    if (__classPrivateFieldGet(this, _CandidForm_identity, 'f')) {
      return new HttpAgent({ identity: __classPrivateFieldGet(this, _CandidForm_identity, 'f') });
    }
    return new AnonymousAgent();
  }
  async setIdentity(identity) {
    __classPrivateFieldSet(this, _CandidForm_identity, identity, 'f');
    this.setAgent(
      await __classPrivateFieldGet(this, _CandidForm_determineAgent, 'f').call(this, true),
    );
    __classPrivateFieldGet(this, _CandidForm_instances, 'm', _CandidForm_init).call(this);
  }
  set identity(identity) {
    this.setIdentity(identity);
  }
  get identity() {
    return __classPrivateFieldGet(this, _CandidForm_identity, 'f');
  }
  async connectedCallback() {
    await __classPrivateFieldGet(this, _CandidForm_instances, 'm', _CandidForm_init).call(this);
    const slot = this.shadowRoot?.querySelector('slot[name="styles"]');
    if (slot) {
      __classPrivateFieldGet(this, _CandidForm_processStyles, 'f').call(this, slot);
    }
    slot?.addEventListener('slotchange', e => {
      __classPrivateFieldGet(this, _CandidForm_processStyles, 'f').call(this, e.target);
    });
  }
}
(_CandidForm_identity = new WeakMap()),
  (_CandidForm_db = new WeakMap()),
  (_CandidForm_agent = new WeakMap()),
  (_CandidForm_canisterId = new WeakMap()),
  (_CandidForm_isLocal = new WeakMap()),
  (_CandidForm_host = new WeakMap()),
  (_CandidForm_title = new WeakMap()),
  (_CandidForm_description = new WeakMap()),
  (_CandidForm_methods = new WeakMap()),
  (_CandidForm_isInitialized = new WeakMap()),
  (_CandidForm_processStyles = new WeakMap()),
  (_CandidForm_determineHost = new WeakMap()),
  (_CandidForm_determineAgent = new WeakMap()),
  (_CandidForm_render = new WeakMap()),
  (_CandidForm_renderStatic = new WeakMap()),
  (_CandidForm_getDidJsFromTmpHack = new WeakMap()),
  (_CandidForm_didToJs = new WeakMap()),
  (_CandidForm_instances = new WeakSet()),
  (_CandidForm_init = async function _CandidForm_init() {
    // check if canister id is provided
    if (this.hasAttribute('canisterId')) {
      const canisterId = this.getAttribute('canisterId')?.trim();
      if (canisterId) {
        __classPrivateFieldSet(this, _CandidForm_canisterId, Principal.fromText(canisterId), 'f');
      }
    }
    if (this.hasAttribute('methods')) {
      const methods = this.getAttribute('methods')
        ?.trim()
        .split(',')
        .map(method => method.trim());
      if (methods) {
        __classPrivateFieldSet(this, _CandidForm_methods, methods, 'f');
      }
    }
    if (this.hasAttribute('host')) {
      __classPrivateFieldSet(this, _CandidForm_host, this.getAttribute('host') ?? undefined, 'f');
    }
    const titleAttribute = this.getAttribute('title');
    if (this.hasAttribute('title') && typeof titleAttribute === 'string') {
      __classPrivateFieldSet(this, _CandidForm_title, titleAttribute, 'f');
    }
    const descriptionAttribute = this.getAttribute('description');
    if (this.hasAttribute('description') && typeof descriptionAttribute === 'string') {
      __classPrivateFieldSet(this, _CandidForm_description, descriptionAttribute, 'f');
    }
    const host = await __classPrivateFieldGet(this, _CandidForm_determineHost, 'f').call(this);
    if (__classPrivateFieldGet(this, _CandidForm_identity, 'f')) {
      await this.setAgent(
        new HttpAgent({
          host: host,
          identity: __classPrivateFieldGet(this, _CandidForm_identity, 'f'),
        }),
      );
    } else {
      await this.setAgent(
        new AnonymousAgent({
          host: host,
        }),
      );
    }
    __classPrivateFieldSet(this, _CandidForm_host, host, 'f');
    __classPrivateFieldSet(
      this,
      _CandidForm_isLocal,
      __classPrivateFieldGet(this, _CandidForm_instances, 'm', _CandidForm_determineLocal).call(
        this,
        __classPrivateFieldGet(this, _CandidForm_host, 'f'),
      ),
      'f',
    );
    if (__classPrivateFieldGet(this, _CandidForm_isLocal, 'f')) {
      await __classPrivateFieldGet(this, _CandidForm_agent, 'f').fetchRootKey();
    }
    const { defineCanisterIdInput } = await import('./CanisterIdInput');
    defineCanisterIdInput();
    await __classPrivateFieldGet(this, _CandidForm_render, 'f').call(this);
    if (!__classPrivateFieldGet(this, _CandidForm_isInitialized, 'f')) {
      __classPrivateFieldSet(this, _CandidForm_isInitialized, true, 'f');
      this.dispatchEvent(new CustomEvent('ready'));
    }
  }),
  (_CandidForm_determineLocal = function _CandidForm_determineLocal(host) {
    if (host && !host.includes('localhost') && !host.includes('127.0.0.1')) {
      // set isLocal to false if host is not localhost
      return false;
    } else if (host && location) {
      // otherwise infer from location
      return location.href.includes('localhost') || location.href.includes('127.0.0.1');
    }
    return false;
  }),
  (_CandidForm_initializeConsoleControls = function _CandidForm_initializeConsoleControls() {
    const consoleEl = this.shadowRoot?.getElementById('console');
    const outputButton = this.shadowRoot?.getElementById('output-button');
    const methodsButton = this.shadowRoot?.getElementById('methods-button');
    const resetButton = this.shadowRoot?.getElementById('reset-button');
    const outputPane = this.shadowRoot?.getElementById('output-pane');
    const methodsPane = this.shadowRoot?.getElementById('methods-pane');
    const buttons = [outputButton, methodsButton];
    const panes = [outputPane, methodsPane];
    const app = this.shadowRoot?.getElementById('app');
    const progress = this.shadowRoot?.getElementById('progress');
    // Set canister ID in the header
    const canisterIdInput = this.shadowRoot?.querySelector('canister-input');
    if (__classPrivateFieldGet(this, _CandidForm_canisterId, 'f')) {
      canisterIdInput.setAttribute(
        'canisterid',
        __classPrivateFieldGet(this, _CandidForm_canisterId, 'f').toText(),
      );
    }
    const handleChange = id => {
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
    progress.remove();
    app.style.display = 'block';
    outputButton.click();
  });
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
