import { authenticator } from "@dfinity/authentication";
import "@dfinity/bootstrap";

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
    onAuthenticationResponsDetectedEvent(event) {
      console.debug("AuthenticationResponseDetectedEvent", {
        url: event.detail.url,
        event,
      });
    }
    connectedCallback() {
      // this.ownerDocument.addEventListener(
      //   AuthenticationResponseDetectedEvent().type,
      //   this.onAuthenticationResponsDetectedEvent
      // );
      this.render();
      authenticator.receiveAuthenticationResponse(
        new URL(this.ownerDocument.location.toString())
      );
    }
    disconnectedCallback() {
      this.ownerDocument.removeEventListener(
        AuthenticationResponseDetectedEvent().type,
        this.onAuthenticationResponsDetectedEvent
      );
    }
    render() {
      // Create a shadow root
      var shadow = this.attachShadow({ mode: "open" });
      while (shadow.firstChild) {
        shadow.firstChild.remove();
      }
      // Create text node and add word count to it
      var button = document.createElement("button", {
        is: "ic-authentication-button",
      });
      // Append it to the shadow root
      shadow.appendChild(button);
    }
  }

  function AuthenticationResponseDetectedEvent(url) {
    return new CustomEvent(
      "https://internetcomputer.org/ns/authentication/AuthenticationResponseDetectedEvent",
      {
        bubbles: true,
        cancelable: true,
        detail: {
          url,
        },
      }
    );
  }

  class AuthenticationButton extends HTMLButtonElement {
    constructor() {
      // Always call super first in constructor
      super();
      const frag = this.ownerDocument.createDocumentFragment();
      // Create text node and add word count to it
      var text = document.createElement("span");
      text.textContent = "Authenticate with IC";
      // Append it to the shadow root
      frag.appendChild(text);
      this.appendChild(frag);
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
