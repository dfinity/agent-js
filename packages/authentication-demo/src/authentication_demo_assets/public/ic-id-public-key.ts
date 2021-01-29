import {
  IdentityDescriptor,
  IdentityRequestedEvent,
} from "@dfinity/authentication";

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
    this.dispatchEvent(IdentityRequestedEvent({
      bubbles: true,
      cancelable: true,
      composed: true,
      onIdentity: (id) => {
        this.onUnknownIdentity(id);
      },
    }));
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

export function isIdentityDescriptor(
  value: unknown | IdentityDescriptor,
): value is IdentityDescriptor {
  switch ((value as IdentityDescriptor)?.type) {
    case 'AnonymousIdentity':
      return true;
    case 'PublicKeyIdentity':
      if (typeof (value as any)?.publicKey !== 'string') return false;
      return true;
  }
  return false;
}
