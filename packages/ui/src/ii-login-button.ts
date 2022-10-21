import { Identity } from '@dfinity/agent';
import { AuthClient } from '@dfinity/auth-client';
import { Principal } from '@dfinity/principal';
import { AccountIdentifier } from '@dfinity/nns';

class LoginEvent extends Event {}
class ReadyEvent extends Event {}

export class IILoginButton extends HTMLElement {
  private _authClient?: AuthClient;
  private _isAuthenticated = false;
  private _identity?: Identity;
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });

    // self styles
    this.setAttribute('style', this.getAttribute('style') ?? 'display: flex; max-width: 400px;');

    // internal styles
    const style = document.createElement('style');
    style.setAttribute('scoped', 'true');
    style.textContent = `
  button {
    box-sizing: border-box;
    display: grid;
    background: white;
    grid-template-columns: 36px auto;
    width: 100%;
    max-width: 400px;
    cursor: pointer;
    border-radius: 0.375rem;
    border: 1px solid rgb(209, 211, 213);
    transition-duration: .15s;
    transition-property: all;
    transition-timing-function: cubic-bezier(.4,0,.2,1);
    padding-bottom: 0.5rem;
    padding-top: 0.5rem;
    padding-left: 0.75rem;
    padding-right: 0.75rem;
    align-items: center;
    font-family: ui-sans-serif, system-ui;
    font-size: 14px;
    box-shadow: none;
    border-image: none;
  }
  button:hover, button:focus {
    background: rgb(244, 250, 255);
    border: 1px solid rgb(89, 147, 252);
  }
  button:active, button:target {
    background: rgb(245, 245, 245);
  }
  svg {
    width: 36px;
    height: fit-content;
  }
`;
    this.shadowRoot?.append(style);

    const wrapper = document.createElement('button');
    wrapper.id = 'ii-login-button';

    const label = this.getAttribute('label') ?? 'Login With Internet Identity';
    wrapper.innerHTML = `${iiLogo}<span id="ii-login-button-label">${label}</span>`;

    this.shadowRoot?.append(wrapper);

    AuthClient.create()
      .then(async client => {
        this._authClient = client;
        this._isAuthenticated = await client.isAuthenticated();
        this._identity = await client.getIdentity();
        // fire ready event
        const event = new ReadyEvent('ready');
        this.dispatchEvent(event);
      })
      .catch(error => {
        console.error(error);
        this._authClient = undefined;
      });
  }

  connectedCallback() {
    const login = this.login.bind(this);
    this.shadowRoot?.querySelector('#ii-login-button')?.addEventListener('click', login);
  }

  attributeChangedCallback(attrName: string, oldVal: unknown, newVal: unknown) {
    switch (attrName) {
      case 'disabled': {
        (this.shadowRoot?.getElementById('ii-login-button') as HTMLButtonElement).disabled =
          newVal === 'true';
        break;
      }
      case 'label': {
        (this._button.querySelector('#ii-login-button-label') as HTMLSpanElement).innerText =
          newVal as string;
        break;
      }
      case 'innerstyle': {
        this._button.setAttribute('style', newVal as string);
        break;
      }
      default: {
        console.log('unhandled attribute change', attrName, oldVal, newVal);
        break;
      }
    }
  }

  static get observedAttributes() {
    return ['onSuccess', 'label', 'disabled', 'innerstyle'];
  }

  private get _button(): HTMLButtonElement {
    return this.shadowRoot?.getElementById('ii-login-button') as HTMLButtonElement;
  }

  get authClient(): AuthClient {
    if (!this._authClient) {
      throw new Error('authClient has failed to initialize');
    }
    return this._authClient;
  }

  get isAuthenticated(): boolean {
    return this._isAuthenticated;
  }

  get identity(): Identity | undefined {
    return this._identity;
  }

  get principal(): Principal | undefined {
    return this._identity?.getPrincipal();
  }

  get principalString(): string | undefined {
    return this.principal?.toString();
  }

  get interface() {
    return `export declare class IILoginButton extends HTMLElement {
    static get observedAttributes(): string[];
    get authClient(): AuthClient;
    get isAuthenticated(): boolean;
    get identity(): Identity | undefined;
    get principal(): Principal | undefined;
    get principalString(): string | undefined;
    get interface(): string;
    get accountId(): string | undefined;
    logout(): void;
}
`;
  }

  get accountId(): string | undefined {
    if (this.principal) {
      const id = AccountIdentifier.fromPrincipal({ principal: this.principal });
      return id.toHex();
    }
    return undefined;
  }

  login(): void {
    const handleSuccess = this._handleSuccess.bind(this);
    this.authClient.login({ onSuccess: handleSuccess });
  }

  private async _handleSuccess() {
    this._authClient = this.authClient;
    this._isAuthenticated = await this.authClient.isAuthenticated();
    this._identity = await this.authClient.getIdentity();
    const event = new LoginEvent('login', { bubbles: true, composed: true });
    this.dispatchEvent(event);
  }

  public logout() {
    this.authClient.logout();
    this._isAuthenticated = false;
    this._identity = undefined;
  }
}

// #region Logo
const iiLogo = `<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" preserveAspectRatio="xMidYMid meet" viewBox="-1 -1 107.42470599999999 54.6597" width="103.42" height="50.66" class="w-8 h-8"><defs><path id="a2oTCciHwU" d="M59.62 9.14C56.48 11.99 53.72 15.07 51.71 17.53C51.71 17.53 54.95 21.18 58.49 25.09C60.41 22.72 63.17 19.51 66.36 16.61C72.26 11.2 76.1 10.11 78.33 10.11C86.64 10.11 93.37 16.92 93.37 25.35C93.37 33.7 86.64 40.51 78.33 40.6C77.94 40.6 77.46 40.55 76.89 40.42C79.29 41.52 81.92 42.31 84.37 42.31C99.58 42.31 102.55 32.03 102.72 31.28C103.16 29.39 103.42 27.42 103.42 25.4C103.38 11.38 92.15 0 78.33 0C72.56 0 66.27 3.08 59.62 9.14Z"></path><linearGradient id="gradientc2rIvyDhN" gradientUnits="userSpaceOnUse" x1="65.17" y1="3.67" x2="99.9" y2="39.44"><stop style="stop-color:#f15a24;stop-opacity:1;" offset="21%"></stop><stop style="stop-color:#fbb03b;stop-opacity:1;" offset="68.41000000000001%"></stop></linearGradient><path id="aFWcwFIax" d="M43.8 41.52C46.95 38.66 49.7 35.59 51.71 33.13C51.71 33.13 48.48 29.48 44.94 25.57C43.01 27.94 40.26 31.15 37.07 34.05C31.17 39.41 27.28 40.55 25.09 40.55C16.79 40.55 10.05 33.74 10.05 25.31C10.05 16.96 16.79 10.15 25.09 10.06C25.48 10.06 25.97 10.11 26.53 10.24C24.13 9.14 21.51 8.35 19.06 8.35C3.85 8.35 0.87 18.63 0.7 19.38C0.26 21.27 0 23.24 0 25.26C0 39.28 11.23 50.66 25.09 50.66C30.86 50.66 37.16 47.58 43.8 41.52Z"></path><linearGradient id="gradientaIMror5Zz" gradientUnits="userSpaceOnUse" x1="38.22" y1="46.97" x2="3.5" y2="11.2"><stop style="stop-color:#ed1e79;stop-opacity:1;" offset="21%"></stop><stop style="stop-color:#522785;stop-opacity:1;" offset="89.29%"></stop></linearGradient><path id="e1RZG6bOc" d="M19.1 8.57C5.24 8.23 1.16 18.1 0.81 19.37C3.47 8.3 13.37 0.04 25.14 0C34.73 0 44.43 9.21 51.59 17.53C51.6 17.51 51.61 17.5 51.62 17.49C51.62 17.49 54.86 21.13 58.4 25.04C58.4 25.04 62.42 29.7 66.71 33.79C68.37 35.37 76.45 41.74 84.23 41.96C98.49 42.36 102.42 31.94 102.64 31.15C100.02 42.27 90.09 50.57 78.29 50.62C68.69 50.62 58.99 41.4 51.8 33.08C51.78 33.1 51.77 33.11 51.76 33.13C51.76 33.13 48.52 29.48 44.98 25.57C44.98 25.57 40.96 20.91 36.68 16.83C35.01 15.25 26.88 8.79 19.1 8.57ZM0.81 19.37C0.8 19.4 0.79 19.43 0.79 19.46C0.79 19.44 0.8 19.41 0.81 19.37Z"></path></defs><g><g><use xlink:href="#a2oTCciHwU" opacity="1" fill="url(#gradientc2rIvyDhN)"></use><g><use xlink:href="#a2oTCciHwU" opacity="1" fill-opacity="0" stroke="#000000" stroke-width="1" stroke-opacity="0"></use></g></g><g><use xlink:href="#aFWcwFIax" opacity="1" fill="url(#gradientaIMror5Zz)"></use><g><use xlink:href="#aFWcwFIax" opacity="1" fill-opacity="0" stroke="#000000" stroke-width="1" stroke-opacity="0"></use></g></g><g><use xlink:href="#e1RZG6bOc" opacity="1" fill="#29abe2" fill-opacity="1"></use><g><use xlink:href="#e1RZG6bOc" opacity="1" fill-opacity="0" stroke="#000000" stroke-width="1" stroke-opacity="0"></use></g></g></g></svg>`;
// #endregion

customElements.define('ii-login-button', IILoginButton);
