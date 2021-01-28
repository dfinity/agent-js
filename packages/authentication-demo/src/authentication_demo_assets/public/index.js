import { authenticator } from "@dfinity/authentication";
import "@dfinity/bootstrap";
import authDemoContract from 'ic:canisters/authentication_demo';

(() => {
  function log(...messages) {
    if (globalThis.console) {
      globalThis.console.log(...messages);
    }
  }
  class AuthenticationDemo extends HTMLElement {
    constructor() {
      // Always call super first in constructor
      super();
    }
    connectedCallback() {
      this.render();
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
          log(`AuthenticationButton got event: ${event.type}`);
      }
    }
    requestAuthentication() {
      authenticator.sendAuthenticationRequest({
        scope: [],
      });
    }
  }
  async function main(el) {
    if (globalThis.customElements) {
      const elements = [
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
