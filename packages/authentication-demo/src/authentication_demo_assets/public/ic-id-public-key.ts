import {
  IdentitiesIterable,
  IdentityChangedEvent,
  IdentityDescriptor,
} from "@dfinity/authentication";
import { makeLog } from "./log";
import { formatPublicKey } from "./publicKey";

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
  #iterateIdentities: undefined | Promise<void>;
  #log = makeLog("AuthenticationSubjectPublicKeyElement");
  constructor() {
    super();
    // @todo: cancel this on disconnectedCallback
    // using http://seg.phault.net/blog/2018/03/async-iterators-cancellation/
    this.#iterateIdentities = (async () => {
      for await (const identity of IdentitiesIterable(this.ownerDocument)) {
        this.useIdentity(identity);
      }
    })();
  }
  handleIdentityChangedEvent(event: IdentityChangedEvent): void {
    this.useIdentity(event.detail.identity);
  }
  /**
   * Change state to a new identity, then re-render.
   * @param identity - new identity to use
   */
  useIdentity(identity: IdentityDescriptor): void {
    this.identity = identity;
    this.#log("debug", "useIdentity called with", identity);
    switch (identity.type) {
      case "PublicKeyIdentity":
        this.setAttribute("publicKey", identity.publicKey);
        break;
      case "AnonymousIdentity":
        this.removeAttribute("publicKey");
        break;
      default: {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const exhaustive: never = identity;
      }
    }
    this.renderChildren();
  }
  /**
   * Completely re-render all children.
   */
  renderChildren(): void {
    while (this.firstChild) {
      this.firstChild.remove();
    }
    this.appendChild(
      ChildrenNode({
        createDocumentFragment: () => document.createDocumentFragment(),
        createTextNode: (t) => document.createTextNode(t),
        publicKeyHex: this.getAttribute("publicKey") || "",
        placeholder: this.getAttribute("placeholder") || "",
        format: this.getAttribute("format") || "hex",
      })
    );
  }
}

/**
 * Create a DOM Node that should be children of AuthenticationSubjectPublicKeyElement.
 * @param options options
 */
function ChildrenNode(
  options: Pick<Document, "createDocumentFragment" | "createTextNode"> & {
    publicKeyHex: string;
    placeholder: string;
    format: string;
  }
): Node {
  const publicKeyHex = options.publicKeyHex;
  if (!publicKeyHex) {
    const text = options.createTextNode(options.placeholder);
    return text;
  }
  const format = options.format;
  switch (format) {
    case "hex":
    case "principal.hex":
    case "principal.text":
      return options.createTextNode(formatPublicKey(format, publicKeyHex));
    default:
      return options.createTextNode(formatPublicKey("hex", publicKeyHex));
  }
}
