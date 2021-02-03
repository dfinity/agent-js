import {
  IdentityDescriptor,
  IdentityRequestedEvent,
  PublicKeyIdentityDescriptor,
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
  render(): void {
    this.innerHTML =
      this.getAttribute("publicKey") ||
      this.getAttribute("initialPublicKey") ||
      this.getAttribute("placeholder") ||
      "";
  }
  connectedCallback(): void {
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
  onUnknownIdentity = (maybeIdentity: unknown): void => {
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
  useIdentity(identity: IdentityDescriptor): void {
    this.identity = identity;
    let exhaustive: never;
    switch (identity.type) {
      case "PublicKeyIdentity":
        this.setAttribute("publicKey", identity.publicKey);
        break;
      case "AnonymousIdentity":
        this.removeAttribute("publicKey");
        break;
      default:
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        exhaustive = identity;
    }
    this.render();
  }
}

/**
 * Type Guard for whether the unknown value is an IdentityDescriptor or not.
 * @param value - value to type guard
 */
export function isIdentityDescriptor(
  value: unknown | IdentityDescriptor
): value is IdentityDescriptor {
  switch ((value as IdentityDescriptor)?.type) {
    case "AnonymousIdentity":
      return true;
    case "PublicKeyIdentity":
      if (typeof (value as PublicKeyIdentityDescriptor)?.publicKey !== "string")
        return false;
      return true;
  }
  return false;
}
