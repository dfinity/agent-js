import { authenticator } from "@dfinity/authentication";
import { Actor, makeLog } from "@dfinity/agent";
import * as canisters from "./canisters";
import { defaultSessionIdentityStorage } from "./session";

/**
 * When clicked, initiates Authentication via @dfinity/authentication authenticator.sendAuthenticationRequest().
 *
 * This can't extend `HTMLButtonElement` and still work in Safari (AFAICT): https://github.com/webcomponents/polyfills/issues/102
 * @todo feel free to extend HTMLButtonElement, just include a polyfill for Safari https://www.npmjs.com/package/@webreflection/custom-elements
 */
export default class AuthenticationButton extends HTMLElement {
  #log = makeLog("AuthenticationButton");
  constructor() {
    super();
    this.addEventListener("click", this.listener);
  }
  connectedCallback(): void {
    const fragment: DocumentFragment = (() => {
      const fragment = this.ownerDocument.createDocumentFragment();
      const button = document.createElement("button");
      const text = document.createTextNode("Authenticate with IC");
      button.appendChild(text);
      fragment.appendChild(button);
      return fragment;
    })();
    this.appendChild(fragment);
  }
  listener(event: Event): void {
    switch (event.type) {
      case "click":
        this.requestAuthentication();
        break;
      default:
        console.debug(`AuthenticationButton got event: ${event.type}`);
    }
  }
  requestAuthentication(): void {
    authenticator.sendAuthenticationRequest({
      saveIdentity: (identity) => {
        this.#log("debug", "sendAuthenticationRequest.saveIdentity", identity);
        defaultSessionIdentityStorage.set(identity);
      },
      scope: [
        {
          type: "CanisterScope",
          principal: Actor.canisterIdOf(canisters.authentication_demo),
        },
      ],
    });
  }
}
