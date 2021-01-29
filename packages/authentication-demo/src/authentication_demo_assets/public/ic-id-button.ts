import { authenticator } from "@dfinity/authentication";

export default class AuthenticationButton extends HTMLButtonElement {
  constructor() {
    super();
    this.appendChild(
      (() => {
        const fragment = this.ownerDocument.createDocumentFragment();
        var text = document.createElement("span");
        text.textContent = "Authenticate with IC";
        fragment.appendChild(text);
        return fragment;
      })()
    );
    this.addEventListener("click", this.listener);
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
      scope: [],
    });
  }
}
