import { authenticator } from "@dfinity/authentication";
// @ts-ignore
import authDemoContract from 'ic:canisters/authentication_demo';

export default class AuthenticationDemo extends HTMLElement {
    constructor() {
      // Always call super first in constructor
      super();
    }
    connectedCallback() {
      this.render();
      authenticator.receiveAuthenticationResponse(new URL(this.ownerDocument.location.toString()));
    }
    render() {
      // Create a shadow root
      var shadow = this.attachShadow({ mode: "open" });
      while (shadow.firstChild) {
        shadow.firstChild.remove();
      }
      // Append it to the shadow root
      shadow.appendChild(document.createElement("button", {
        is: "ic-authentication-button",
      }));
      shadow.appendChild(
        (() => {
          const testAgentButton = document.createElement('button');
          testAgentButton.innerHTML = `Test Agent`
          testAgentButton.addEventListener('click', this.onClickTestAgent)
          return testAgentButton;
        })(),
      );
      console.log('ben about to ic-authentication-subject-public-key')
      shadow.appendChild(
        (() => {
          const div = document.createElement('div');
          div.innerHTML = `
            <p>
              The current authentication's publicKey is <ic-authentication-subject-public-key />
            <p>
          `
          return div;
        })(),
      )
    }
    async onClickTestAgent(event) {
      console.log('onClickTestAgent start', { event })
      try {
        const response = await authDemoContract.whoami();
        console.log('onClickTestAgent response', { response })
      } catch (error) {
        console.error("Error calling whoami() in contract", error);
        throw error;
      }
    }
  }