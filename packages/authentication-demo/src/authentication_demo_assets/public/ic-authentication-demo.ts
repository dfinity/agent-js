import { authenticator } from "@dfinity/authentication";
// @ts-ignore
import authDemoContract from "ic:canisters/authentication_demo";
import { Principal } from "@dfinity/agent";
import { hexEncodeUintArray } from "@dfinity/authentication/.tsc-out/packages/authentication/src/idp-protocol/bytes";

export default class AuthenticationDemo extends HTMLElement {
  whoamiPrincipal: Principal | undefined;
  constructor() {
    // Always call super first in constructor
    super();
  }
  connectedCallback() {
    this.render();
    authenticator.receiveAuthenticationResponse(
      new URL(this.ownerDocument.location.toString())
    );
  }
  render() {
    // Create a shadow root
    const shadow = this.shadowRoot || this.attachShadow({ mode: "open" });
    while (shadow.firstChild) {
      shadow.firstChild.remove();
    }
    // Append it to the shadow root
    shadow.appendChild(
      document.createElement("button", {
        is: "ic-authentication-button",
      })
    );
    shadow.appendChild(
      (() => {
        const testAgentButton = document.createElement("button");
        testAgentButton.innerHTML = `Test Agent`;
        testAgentButton.addEventListener("click", this.onClickTestAgent);
        return testAgentButton;
      })()
    );
    console.log("ben about to ic-authentication-subject-public-key");
    shadow.appendChild(
      (() => {
        const div = document.createElement("div");
        div.innerHTML = `
            <p>
              The current authentication's publicKey is <ic-authentication-subject-public-key />
            <p>
          `;
        return div;
      })()
    );
    if (this.whoamiPrincipal) {
      shadow.appendChild(
        Object.assign(document.createElement("div"), {
          innerHTML: `
            <p>
              The contract's last <code>whoami()</code> response was
              <dl>
                <dt>Principal Text</dt><dd>
                  <span>${this.whoamiPrincipal.toText()}</span>
                </dd>
                <dt>Public Key Hex</dt><dd>
                  <span>${hexEncodeUintArray(
                    this.whoamiPrincipal.toBlob()
                  )}</span>
                </dd>
              </dl>
              
            <p>
          `,
        })
      );
    }
  }
  onClickTestAgent = async (event: Event) => {
    console.log("onClickTestAgent start", { event });
    let response: unknown;
    try {
      response = await authDemoContract.whoami();
      console.log("onClickTestAgent response", {
        response,
        Principal,
        isPrincipal: response instanceof Principal,
      });
    } catch (error) {
      console.error("Error calling whoami() in contract", error);
      throw error;
    }
    if (isPrincipal(response)) {
      this.whoamiPrincipal = response;
      this.render();
    }
  };
}

function isPrincipal(p: unknown): p is Principal {
  if (!p) return false;
  if (typeof (p as Principal).toBlob !== "function") return false;
  if (typeof (p as Principal).toText !== "function") return false;
  return true;
}
