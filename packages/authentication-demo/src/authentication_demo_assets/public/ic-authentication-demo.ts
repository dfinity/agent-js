import { authenticator } from "@dfinity/authentication";
// @ts-ignore
import authDemoContract from "ic:canisters/authentication_demo";
import { Principal } from "@dfinity/agent";
import { hexEncodeUintArray } from "@dfinity/authentication/.tsc-out/packages/authentication/src/idp-protocol/bytes";
import AuthenticationButton from "./ic-id-button";

/**
 * Main Custom Element for the @dfinity/authentication-demo.
 * It should:
 * * render an ic-authentication-button that the end-user can use to initiate login.
 * * render a button to test the @dfinity/agent included by @dfinity/bootstrap to see whether it picks up the identity from any AuthenticationResponse
 *   * When someone clicks this, make a request to the `whoami()` method of the motoko actor,
 *     which should echo back this agent's identity, which this element should render to the end-user.
 */
export default class AuthenticationDemo extends HTMLElement {
  whoamiPrincipal: Principal | undefined;
  constructor() {
    super();
  }
  connectedCallback() {
    this.render();
    authenticator.receiveAuthenticationResponse(
      new URL(this.ownerDocument.location.toString())
    );
  }
  /**
   * Clear out children and re-append-children based on latest state.
   */
  render() {
    const shadow = this.shadowRoot || this.attachShadow({ mode: "open" });
    while (shadow.firstChild) {
      shadow.firstChild.remove();
    }
    shadow.appendChild(new AuthenticationButton());
    shadow.appendChild(
      (() => {
        const testAgentButton = document.createElement("button");
        testAgentButton.innerHTML = `Test Agent`;
        testAgentButton.addEventListener("click", this.onClickTestAgent);
        return testAgentButton;
      })()
    );
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
  /**
   * click handler for 'Test Agent' button.
   * @param event - ClickEvent from clicking
   */
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
