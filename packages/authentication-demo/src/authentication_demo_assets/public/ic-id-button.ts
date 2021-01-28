import { authenticator } from "@dfinity/authentication";

export default class AuthenticationButton extends HTMLButtonElement {
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
  listener(event: Event) {
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
