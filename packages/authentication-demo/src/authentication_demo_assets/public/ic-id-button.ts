import { authenticator } from "@dfinity/authentication";
import { Actor } from "@dfinity/agent";
import * as canisters from "./canisters";

/**
 * When clicked, initiates Authentication via @dfinity/authentication authenticator.sendAuthenticationRequest().
 * 
 * This can't extend `HTMLButtonElement` and still work in Safari (AFAICT): https://github.com/webcomponents/polyfills/issues/102
 * @todo feel free to extend HTMLButtonElement, just include a polyfill for Safari https://www.npmjs.com/package/@webreflection/custom-elements
 */
export default class AuthenticationButton extends HTMLElement {
  constructor() {
    super();
    this.addEventListener("click", this.listener);
  }
  connectedCallback() {
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
  listener(event: Event) {
    switch (event.type) {
      case "click":
        this.requestAuthentication();
        break;
      default:
        console.debug(`AuthenticationButton got event: ${event.type}`);
    }
  }
  requestAuthentication() {
    authenticator.sendAuthenticationRequest({
      scope: [
        {
          type: "CanisterScope",
          principal: Actor.canisterIdOf(canisters.authentication_demo),
        }
      ],
    });
  }
}
