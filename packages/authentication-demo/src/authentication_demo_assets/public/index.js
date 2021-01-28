import { authenticator } from "@dfinity/authentication";
import authDemoContract from 'ic:canisters/authentication_demo';

(() => {
  const BootstrapIdentityChangedEventType = 'https://internetcomputer.org/ns/authentication/BootstrapIdentityChangedEvent'
  const BootstrapIdentityRequestedEventType = 'BootstrapIdentityRequestedEvent'
  function BootstrapIdentityRequestedEvent(spec) {
    return new CustomEvent(
      BootstrapIdentityRequestedEventType,
      {
        bubbles: true,
        cancelable: true,
        detail: {
          sender: spec.sender,
        }
      }
    )
  }
  class AuthenticationDemo extends HTMLElement {
    constructor() {
      // Always call super first in constructor
      super();
    }
    connectedCallback() {
      this.render();
      authenticator.receiveAuthenticationResponse(new URL(this.ownerDocument.location.toString()));
    }
    render() {
      // Create a shadow root
      var shadow = this.attachShadow({ mode: "open" });
      while (shadow.firstChild) {
        shadow.firstChild.remove();
      }
      // Append it to the shadow root
      shadow.appendChild(document.createElement("button", {
        is: "ic-authentication-button",
      }));
      shadow.appendChild(
        (() => {
          const testAgentButton = document.createElement('button');
          testAgentButton.innerHTML = `Test Agent`
          testAgentButton.addEventListener('click', this.onClickTestAgent)
          return testAgentButton;
        })(),
      );
      console.log('ben about to ic-authentication-subject-public-key')
      shadow.appendChild(
        (() => {
          const div = document.createElement('div');
          div.innerHTML = `
            <p>
              The current authentication's publicKey is <ic-authentication-subject-public-key />
            <p>
          `
          return div;
        })(),
      )
    }
    async onClickTestAgent(event) {
      console.log('onClickTestAgent start', { event })
      try {
        const response = await authDemoContract.whoami();
        console.log('onClickTestAgent response', { response })
      } catch (error) {
        console.error("Error calling whoami() in contract", error);
        throw error;
      }
    }
  }

  class AuthenticationButton extends HTMLButtonElement {
    constructor() {
      // Always call super first in constructor
      super();
      this.appendChild((() => {
        const fragment = this.ownerDocument.createDocumentFragment();
        // Create text node and add word count to it
        var text = document.createElement("span");
        text.textContent = "Authenticate with IC";
        // Append it to the shadow root
        fragment.appendChild(text);
        return fragment;
      })());
      this.addEventListener("click", this.listener);
    }
    listener(event) {
      switch (event.type) {
        case "click":
          this.requestAuthentication();
          break;
        default:
          console.log(`AuthenticationButton got event: ${event.type}`);
      }
    }
    requestAuthentication() {
      authenticator.sendAuthenticationRequest({
        scope: [],
      });
    }
  }

  class AuthenticationSubjectPublicKeyElement extends HTMLElement {
    constructor() {
      super();
    }
    render() {
      this.innerHTML = this.getAttribute('publicKey') || this.getAttribute('initialPublicKey') || this.getAttribute('placeholder') || '';
    }
    connectedCallback() {
      console.log('info', 'AuthenticationSubjectPublicKeyElement connectedCallback')
      this.render();
      this.ownerDocument.addEventListener(BootstrapIdentityChangedEventType, e => this.onIdentityChangedEvent(e), true);

      const bootstrapIdentityChannel = new MessageChannel();
      bootstrapIdentityChannel.port2.onmessage = (event) => {
        console.log('bootstrapIdentityChannel.port2.onmessage', event);
        const data = event && event.data;
        const identity = data && data.identity;
        if ( !identity) {
          console.warn(`Cannot determine identity from bootstrapIdentityChannel message`);
          return;
        }
        if (this.identity) {
          console.warn('got identity from BootstrapIdentityRequestedEvent, but there is already an identity! skip')
        } else {
          this.useIdentity(identity)
        }
      }
      // const event = BootstrapIdentityRequestedEvent({ sender: bootstrapIdentityChannel.port1 })
      // console.debug('AuthenticationSubjectPublicKeyElement dispatching BootstrapIdentityRequestedEvent', event)
      this.ownerDocument.dispatchEvent(new CustomEvent('BenEvent', {
        bubbles: true,
        detail: {
          reason: 'testing dispatch from ownerDocument'
        }
      }))
      this.ownerDocument.dispatchEvent(new CustomEvent('BootstrapIdentityRequestedEvent', {
        bubbles: true,
        detail: {
          reason: 'testing dispatch from ownerDocument BootstrapIdentityRequestedEvent',
          sender: bootstrapIdentityChannel.port1
        }
      }))
    }
    onBootstrapIdentityMessageEvent(event) {
      console.log('AuthenticationSubjectPublicKeyElement.onBootstrapIdentityMessageEvent', event);
      const data = event && event.data;
      const identity = data && data.identity
      if (identity) this.useIdentity(identity);
    }
    onIdentityChangedEvent(event) {
      const identity = event && event.detail;
      if (identity) {
        this.useIdentity(identity)
      }
    }
    useIdentity(identity) {
      console.debug('useIdentity', identity)
      this.identity = identity;
      if (identity.publicKey) {
        this.setAttribute('publicKey', identity.publicKey)
      }
      this.render();
    }
  }

  async function main(el) {
    if (globalThis.customElements) {
      const elements = [
        ["ic-authentication-subject-public-key", AuthenticationSubjectPublicKeyElement],
        ["ic-authentication-demo", AuthenticationDemo, {}],
        [
          "ic-authentication-button",
          AuthenticationButton,
          { extends: "button" },
        ],
      ];
      for (const [tagName, ElementConstructor, opts] of elements) {
        if (customElements.get(tagName)) {
          console.debug("customElement already defined. skipping.", tagName);
        } else {
          customElements.define(tagName, ElementConstructor, opts);
        }
      }
      await Promise.all(
        elements.map(async ([tagName]) => {
          await customElements.whenDefined(tagName);
        })
      );
    } else {
      console.warn(
        "globalThis.customElements not supported. ic-authentiction-demo will not load"
      );
      return;
    }
    el.innerHTML = `
      <ic-authentication-demo />
    `;
  }

  const el =
    document.querySelector("ic-bootstrap") || document.querySelector("app");
  if (!el) {
    throw new Error("Failed to find app el");
  }
  main(el);
})();
