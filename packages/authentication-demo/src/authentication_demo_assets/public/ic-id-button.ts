import { authenticator } from "@dfinity/authentication";
import { Actor, makeLog } from "@dfinity/agent";
import * as canisters from "./canisters";
import { defaultSessionStorage } from "./session";
import tweetnacl from "tweetnacl";
import { hexToBytes, toHex } from "./bytes";

/**
 * When clicked, initiates Authentication via @dfinity/authentication authenticator.sendAuthenticationRequest().
 *
 * This can't extend `HTMLButtonElement` and still work in Safari (AFAICT): https://github.com/webcomponents/polyfills/issues/102
 * @todo feel free to extend HTMLButtonElement, just include a polyfill for Safari https://www.npmjs.com/package/@webreflection/custom-elements
 */
export default class AuthenticationButton extends HTMLElement {
  #log = makeLog("AuthenticationButton");
  #session = defaultSessionStorage;
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
  async listener(event: Event): Promise<void> {
    switch (event.type) {
      case "click":
        await this.requestAuthentication();
        break;
      default:
        console.debug(`AuthenticationButton got event: ${event.type}`);
    }
  }
  async requestAuthentication(): Promise<void> {
    const sessionKeyPair = tweetnacl.sign.keyPair.fromSeed(tweetnacl.randomBytes(32))
    const session = {
      identity: {
        secretKey: {
          hex: toHex(sessionKeyPair.secretKey),
        },
      },
    };
    this.#log("debug", "setting new session", session);
    await this.#session.set(session);
    authenticator.sendAuthenticationRequest({
      session: {
        identity: {
          publicKey: {
            toDer() {
              return Uint8Array.from([
                ...hexToBytes('302a300506032b6570032100'),
                ...sessionKeyPair.publicKey,
              ]);
            }
          },
        },
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
