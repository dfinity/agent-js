import { authenticator } from "@dfinity/authentication";
// @ts-expect-error 'ic:canisters' is not resolvable without dfx-knowledge
import authDemoContract from "ic:canisters/authentication_demo";
import { Principal } from "@dfinity/agent";
import AuthenticationButton from "./ic-id-button";
import { defaultSessionStorage, SessionIdentitySignFunction } from "./session";
import { toHex } from "./bytes";

/**
 * Main Custom Element for the @dfinity/authentication-demo.
 * It should:
 * * render an ic-authentication-button that the end-user can use to initiate login.
 * * render a button to test the @dfinity/agent included by @dfinity/bootstrap to see whether it picks up the identity from any AuthenticationResponse
 *   * When someone clicks this, make a request to the `whoami()` method of the motoko actor,
 *     which should echo back this agent's identity, which this element should render to the end-user.
 */
export default class AuthenticationDemo extends HTMLElement {
  protected sessionStorage = defaultSessionStorage;
  whoamiPrincipal: Principal | undefined;
  constructor() {
    super();
  }
  connectedCallback(): void {
    this.render();
    this.initializeAuthentication();
  }
  protected initializeAuthentication = async (): Promise<void> => {
    const { value: session } = await this.sessionStorage.get();
    if (!session) {
      console.debug("initializeAuthentication got no session from storage");
      return;
    }
    const url = new URL(location.href);
    let authenticationResponse = session.authenticationResponse;
    if (!authenticationResponse && url.searchParams.has("access_token")) {
      authenticationResponse = url.toString();
      await this.sessionStorage.set({
        ...session,
        authenticationResponse,
      });
    }
    if (authenticationResponse) {
      authenticator.useSession({
        authenticationResponse,
        identity: {
          sign: async (challenge) => {
            if (/signRequiresConfirm/i.test(location.href)) {
              const confirmationRequest: string = [
                "Do you want to sign?",
                `challenge = ${toHex(new Uint8Array(challenge))}`,
              ].join("\n\n");
              if (!confirm(confirmationRequest)) {
                throw new Error(
                  "signing did not receive confirmation from end-user"
                );
              }
            }
            return SessionIdentitySignFunction(session.identity)(challenge);
          },
        },
      });
    }
  };
  /**
   * Clear out children and re-append-children based on latest state.
   */
  render(): void {
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
            The current authentication's info is:
          <p>
          <dl>
            <dt>Public Key</dt><dd>
              <ic-authentication-subject-public-key format="hex" placeholder="&hellip;" />
            </dd>
            <dt>Principal Text</dt><dd>
              <ic-authentication-subject-public-key format="principal.text" placeholder="&hellip;" />
            </dd>
            <dt>Principal Hex</dt><dd>
              <ic-authentication-subject-public-key format="principal.hex" placeholder="&hellip;" />
            </dd>
          </dl>
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
                <dt>Principal Blob Hex</dt><dd>
                  <span>${this.whoamiPrincipal.toBlob().toString("hex")}</span>
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
  onClickTestAgent = async (event: Event): Promise<void> => {
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
      if (
        this.whoamiPrincipal &&
        this.whoamiPrincipal.toHex() === response.toHex()
      ) {
        console.debug("whoamiPrincipal is same as before. Skiping unnecessary re-render.");
      } else {
        this.whoamiPrincipal = response;
        this.render();
      }
    }
  };
}

function isPrincipal(p: unknown): p is Principal {
  if (!p) return false;
  if (typeof (p as Principal).toBlob !== "function") return false;
  if (typeof (p as Principal).toText !== "function") return false;
  return true;
}
