import {
  IdentityDescriptor,
  IdentityRequestedEvent,
} from "@dfinity/authentication";

/**
 * Render the currently-authenticated identity from @dfinity/authentication.
 * If there is only a AnonymousIdentity, render nothing.
 * If there is a PublicKeyIdentity, render the publicKey hex.
 *
 * We broadcast an IdentityRequestedEvent with a callback to find out about each new identity and re-render.
 *
 * (Bring your own styles! This is just an HTML element)
 */
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
    this.dispatchEvent(
      IdentityRequestedEvent({
        bubbles: true,
        cancelable: true,
        composed: true,
        onIdentity: (id) => {
          this.onUnknownIdentity(id);
        },
      })
    );
    this.render();
  }
  /**
   * The value passed back from IdentityRequestedEvent onIdentity callback is `unknown`,
   * since it may be from an actor at another version that any code we have access to.
   * This method needs to do some inference about what kind of value it is, try to build an Identity, then call `this.useIdentity`
   * @param maybeIdentity - unknown value from IdentityRequestedEvent onIdentity callback.
   */
  onUnknownIdentity = (maybeIdentity: unknown) => {
    if (!isIdentityDescriptor(maybeIdentity)) {
      console.debug(
        "onUnknownIdentity received unknown value as identity",
        maybeIdentity
      );
      return;
    }
    this.useIdentity(maybeIdentity);
  };
  /**
   * Change state to a new identity, then re-render.
   * @param identity - new identity to use
   */
  useIdentity(identity: IdentityDescriptor) {
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
  value: unknown | IdentityDescriptor
): value is IdentityDescriptor {
  switch ((value as IdentityDescriptor)?.type) {
    case "AnonymousIdentity":
      return true;
    case "PublicKeyIdentity":
      if (typeof (value as any)?.publicKey !== "string") return false;
      return true;
  }
  return false;
}
