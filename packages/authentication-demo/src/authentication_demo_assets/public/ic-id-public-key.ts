import {
  IdentityDescriptor,
  IdentityRequestedEvent,
} from "@dfinity/authentication";
import { isIdentityDescriptor } from "@dfinity/bootstrap/ts-out/packages/bootstrap/src/actors/identity/IdentityDescriptor";

export default class AuthenticationSubjectPublicKeyElement extends HTMLElement {
  identity: IdentityDescriptor | null = null;
  constructor() {
    super();
  }
  render() {
    this.innerHTML =
      this.getAttribute("publicKey") ||
      this.getAttribute("initialPublicKey") ||
      this.getAttribute("placeholder") ||
      "";
  }
  connectedCallback() {
    const identityRequestedEvent = IdentityRequestedEvent({
      bubbles: true,
      cancelable: true,
      onIdentity: (id) => {
        this.onUnknownIdentity(id);
      },
    });
    this.dispatchEvent(identityRequestedEvent);
    this.render();
  }
  onUnknownIdentity = (maybeIdentity: unknown) => {
    console.debug("onUnknownIdentity", maybeIdentity);
    if (!isIdentityDescriptor(maybeIdentity)) {
      console.debug(
        "onUnknownIdentity received unknown value as identity",
        maybeIdentity
      );
      return;
    }
    this.useIdentity(maybeIdentity);
  };
  useIdentity(identity: IdentityDescriptor) {
    console.debug("useIdentity", identity);
    this.identity = identity;
    switch (identity.type) {
      case "PublicKeyIdentity":
        this.setAttribute("publicKey", identity.publicKey);
        break;
      case "AnonymousIdentity":
        this.removeAttribute("publicKey");
        break;
      default:
        let x: never = identity;
    }
    this.render();
  }
}
