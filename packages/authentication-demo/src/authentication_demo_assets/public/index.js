import { authenticator } from '@dfinity/authentication';

(() => {
  log('log: authentication_docs_demo iffe start')
  function log(...messages) {
    if (globalThis.console) {
      globalThis.console.log(...messages);
    }
  }
  class AuthenticationDemo extends HTMLElement {
    constructor() {
      // Always call super first in constructor
      super();
      log('AuthenticationDemo constructor')
      const parent = this.parentNode;
      // Create a shadow root
      var shadow = this.attachShadow({mode: 'open'});
      // Create text node and add word count to it
      log('AuthenticationDemo constructing AuthenticationButton')
      var button = document.createElement('button', {
        is: 'ic-authentication-button',
      })
      // Append it to the shadow root
      shadow.appendChild(button);
    }
    detectAndPublishAuthenticationResponse(url) {
      log('AuthenticationDemo', 'detectAndPublishAuthenticationResponse', url)
      const isMaybeAuthenticationResponse = Boolean(url.searchParams.has('access_token'));
      if (isMaybeAuthenticationResponse) {
        this.dispatchEvent(
          AuthenticationResponseDetectedEvent(new URL(globalThis.location.toString())),
        )
      } else {
        console.debug('AuthenticationDemo did not detect access_token in url')
      }
    }
    connectedCallback() {
      authenticator.receiveAuthenticationResponse(new URL(globalThis.location.toString()))
    }
  }

  function AuthenticationResponseDetectedEvent(url) {
    return new CustomEvent('https://internetcomputer.org/ns/authentication/AuthenticationResponseDetectedEvent', {
      bubbles: true,
      cancelable: true,
      detail: {
        url,
      },
    });
  }

  class AuthenticationButton extends HTMLButtonElement {
    constructor() {
      // Always call super first in constructor
      super();
      log('AuthenticationButton constructor')
      const frag = this.ownerDocument.createDocumentFragment();
      // Create text node and add word count to it
      var text = document.createElement('span');
      text.textContent = 'Authenticate with IC';
      // Append it to the shadow root
      frag.appendChild(text);
      this.appendChild(frag);
      this.addEventListener('click', this.listener)
    }
    listener(event) {
      switch (event.type) {
        case "click":
          this.requestAuthentication();
          break;
        default:
          log(`AuthenticationButton got event: ${event.type}`)
      }
    }
    requestAuthentication() {
      console.log('requestAuthentication')
      authenticator.sendAuthenticationRequest({
        scope: [],
      })
    }
  }
  function main(el=document.querySelector('app')) {
    el.ownerDocument.addEventListener(AuthenticationResponseDetectedEvent().type, (event) => {
      console.debug('AuthenticationResponseDetectedEvent', {
        url: event.detail.url,
        event,
      })
    })
    if (globalThis.customElements) {
      globalThis.customElements.define('ic-authentication-demo', AuthenticationDemo);
      globalThis.customElements.define('ic-authentication-button', AuthenticationButton, { extends: 'button' });  
    } else {
      console.warn('globalThis.customElements not supported. ic-authentiction-demo will not load')
      return;
    }
    el.innerHTML = `
      <ic-authentication-demo />
    `
  }
  
  main()    
})();
