import { Identity } from '@dfinity/agent';
import { AuthClient, AuthClientCreateOptions, AuthClientLoginOptions } from '@dfinity/auth-client';
import { Principal } from '@dfinity/principal';
import { AccountIdentifier } from '@dfinity/nns';
import { LoginButton } from './login-button';
import { AuthClientStorage } from '@dfinity/auth-client';

class LoginEvent extends Event {}
class ReadyEvent extends Event {}

/**
 * Options to configure authClient used by IILoginButton
 * @example
 * button.addEventListener('ready', (e)=>{
 *  // configure login and auth-client options here:
 *  e.target.configure({
 *    identityProvider: "http://localhost:3000"
 *  });
 * })
 */
export type IILoginButtonProps = {
  createOptions?: AuthClientCreateOptions;
  loginOptions?: AuthClientLoginOptions;
  storage?: AuthClientStorage;
};

interface State {
  authClient?: AuthClient;
  isAuthenticated: boolean;
  identity?: Identity;
  ready: boolean;
  createOptions?: AuthClientCreateOptions;
  loginOptions?: AuthClientLoginOptions;
  storage?: AuthClientStorage;
}

/**
 * Internet Identity Login Button
 * Drop-in web component to allow your users to log in with Internet Identity
 *
 * To use:
 * Set up the component with <ii-login-button></ii-login-button>
 * @example
 * button.addEventListener('ready', (e)=>{
 *  // configure login and auth-client options here:
 *  e.target.configure(options);
 * })
 * button.addEventListener('login', (e)=>{
 *  // Access authClient
 *  const client = e.target.authClient;
 *  // Principal
 *  const principal = e.target.principal // also principalString
 *  // AccountIdentifier for ICP ledger
 *  const account = e.target.accountIdentifier
 * })
 */
export class IILoginButton extends LoginButton {
  private _state: State;
  constructor() {
    super();
    if (!this.shadowRoot) {
      this.attachShadow({ mode: 'open' });
    }
    this._state = {
      isAuthenticated: false,
      ready: false,
    };

    this.init();
    this.render();
  }

  private init() {
    AuthClient.create(this._state.createOptions)
      .then(async client => {
        this.setState({
          ...this._state,
          authClient: client,
          isAuthenticated: await client.isAuthenticated(),
          identity: await client.getIdentity(),
        });
        // fire ready event
        if (!this._state.ready) {
          const event = new ReadyEvent('ready');
          this.dispatchEvent(event);
          this.setState({ ready: true });
        }
      })
      .catch(error => {
        console.error(error);
        this.setState({ authClient: undefined });
      });
  }

  connectedCallback() {
    const login = this._login.bind(this);
    this.shadowRoot?.querySelector('#ii-login-button')?.addEventListener('click', login);
  }

  setState(newState: { [Property in keyof State]+?: State[Property] }) {
    this._state = {
      ...this._state,
      ...newState,
    };
  }

  private render() {
    const shadowRoot = this.shadowRoot as ShadowRoot;
    const oldButton = shadowRoot.querySelector('button');
    const newButton = document.createElement('button');
    newButton.id = 'ii-login-button';

    const logoRight = this.hasAttribute('logo-right');
    const label = this.getAttribute('label') ?? 'Login With Internet Identity';
    if (logoRight) {
      newButton.innerHTML = `
          <span slot="label">${label}</span>
          <span slot="logo">${iiLogo}</span>`;
    } else {
      newButton.innerHTML = `
        <span slot="logo">${iiLogo}</span>
        <span slot="label">${label}</span>`;
    }

    if (oldButton) {
      shadowRoot.removeChild(oldButton);
    }
    shadowRoot.appendChild(newButton);
    const login = this._login.bind(this);
    newButton.addEventListener('click', login);
  }

  attributeChangedCallback(attrName: string, oldVal: unknown, newVal: unknown) {
    const button = this.shadowRoot?.getElementById('ii-login-button') as HTMLButtonElement;
    switch (attrName) {
      case 'disabled': {
        button.disabled = newVal === 'true';
        break;
      }
      case 'label': {
        (button.querySelector('#ii-login-button-label') as HTMLSpanElement).innerText =
          newVal as string;
        break;
      }
      case 'innerstyle': {
        button.setAttribute('style', newVal as string);
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

  /**
   * @returns the internal {@link AuthClient} used in the component
   */
  get authClient(): AuthClient {
    if (!this._state.authClient) {
      throw new Error('authClient has failed to initialize');
    }
    return this._state.authClient;
  }

  /**
   * @returns whether the current identity is authenticated or is anonymous
   */
  get isAuthenticated(): boolean {
    return this._state.isAuthenticated;
  }

  /**
   * @returns the current {@link Identity}
   */
  get identity(): Identity | undefined {
    return this._state.identity;
  }

  /**
   * @returns the {@link Principal} of the current {@link Identity}
   */
  get principal(): Principal | undefined {
    return this._state.identity?.getPrincipal();
  }

  /**
   * @returns string of the {@link Principal}
   */
  get principalString(): string | undefined {
    return this.principal?.toString();
  }

  /**
   * @returns the default {@link AccountIdentifier} for the current principal as a string
   */
  get accountId(): string | undefined {
    if (this.principal) {
      const id = AccountIdentifier.fromPrincipal({ principal: this.principal });
      return id.toHex();
    }
    return undefined;
  }

  /**
   * internal method - do not call
   */
  private _login(): void {
    const handleSuccess = this._handleSuccess.bind(this);
    this.authClient.login({ ...this._state.loginOptions, onSuccess: handleSuccess });
  }

  /**
   * internal method - do not call
   */
  private async _handleSuccess() {
    this.setState({
      authClient: this.authClient,
      isAuthenticated: await this.authClient.isAuthenticated(),
      identity: await this.authClient.getIdentity(),
    });
    const event = new LoginEvent('login', { bubbles: true, composed: true });
    this._state.loginOptions?.onSuccess?.();
    this.dispatchEvent(event);
  }

  /**
   * Logs out authClient and clears storage
   */
  public logout() {
    this.setState({
      isAuthenticated: false,
      identity: undefined,
    });
    this.authClient.logout();
  }

  /**
   *
   * @param {IILoginButtonProps} props - change defaults for {@link AuthClient} login, create, and storage
   * @param {IILoginButtonProps["createOptions"]} props.createOptions - {@link AuthClientCreateOptions}
   * @param {IILoginButtonProps["storage"]} props.loginOptions - {@link AuthClientLoginOptions}
   * @param {IILoginButtonProps["storage"]} props.storage - {@link AuthClientStorage}
   */
  public configure(props: IILoginButtonProps) {
    this.setState(props);
    this.init();
    this.render();
  }
}

// #region Logo
const iiLogo = `<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" preserveAspectRatio="xMidYMid meet" viewBox="-1 -1 107.42470599999999 54.6597" width="103.42" height="50.66" class="w-8 h-8"><defs><path id="a2oTCciHwU" d="M59.62 9.14C56.48 11.99 53.72 15.07 51.71 17.53C51.71 17.53 54.95 21.18 58.49 25.09C60.41 22.72 63.17 19.51 66.36 16.61C72.26 11.2 76.1 10.11 78.33 10.11C86.64 10.11 93.37 16.92 93.37 25.35C93.37 33.7 86.64 40.51 78.33 40.6C77.94 40.6 77.46 40.55 76.89 40.42C79.29 41.52 81.92 42.31 84.37 42.31C99.58 42.31 102.55 32.03 102.72 31.28C103.16 29.39 103.42 27.42 103.42 25.4C103.38 11.38 92.15 0 78.33 0C72.56 0 66.27 3.08 59.62 9.14Z"></path><linearGradient id="gradientc2rIvyDhN" gradientUnits="userSpaceOnUse" x1="65.17" y1="3.67" x2="99.9" y2="39.44"><stop style="stop-color:#f15a24;stop-opacity:1;" offset="21%"></stop><stop style="stop-color:#fbb03b;stop-opacity:1;" offset="68.41000000000001%"></stop></linearGradient><path id="aFWcwFIax" d="M43.8 41.52C46.95 38.66 49.7 35.59 51.71 33.13C51.71 33.13 48.48 29.48 44.94 25.57C43.01 27.94 40.26 31.15 37.07 34.05C31.17 39.41 27.28 40.55 25.09 40.55C16.79 40.55 10.05 33.74 10.05 25.31C10.05 16.96 16.79 10.15 25.09 10.06C25.48 10.06 25.97 10.11 26.53 10.24C24.13 9.14 21.51 8.35 19.06 8.35C3.85 8.35 0.87 18.63 0.7 19.38C0.26 21.27 0 23.24 0 25.26C0 39.28 11.23 50.66 25.09 50.66C30.86 50.66 37.16 47.58 43.8 41.52Z"></path><linearGradient id="gradientaIMror5Zz" gradientUnits="userSpaceOnUse" x1="38.22" y1="46.97" x2="3.5" y2="11.2"><stop style="stop-color:#ed1e79;stop-opacity:1;" offset="21%"></stop><stop style="stop-color:#522785;stop-opacity:1;" offset="89.29%"></stop></linearGradient><path id="e1RZG6bOc" d="M19.1 8.57C5.24 8.23 1.16 18.1 0.81 19.37C3.47 8.3 13.37 0.04 25.14 0C34.73 0 44.43 9.21 51.59 17.53C51.6 17.51 51.61 17.5 51.62 17.49C51.62 17.49 54.86 21.13 58.4 25.04C58.4 25.04 62.42 29.7 66.71 33.79C68.37 35.37 76.45 41.74 84.23 41.96C98.49 42.36 102.42 31.94 102.64 31.15C100.02 42.27 90.09 50.57 78.29 50.62C68.69 50.62 58.99 41.4 51.8 33.08C51.78 33.1 51.77 33.11 51.76 33.13C51.76 33.13 48.52 29.48 44.98 25.57C44.98 25.57 40.96 20.91 36.68 16.83C35.01 15.25 26.88 8.79 19.1 8.57ZM0.81 19.37C0.8 19.4 0.79 19.43 0.79 19.46C0.79 19.44 0.8 19.41 0.81 19.37Z"></path></defs><g><g><use xlink:href="#a2oTCciHwU" opacity="1" fill="url(#gradientc2rIvyDhN)"></use><g><use xlink:href="#a2oTCciHwU" opacity="1" fill-opacity="0" stroke="#000000" stroke-width="1" stroke-opacity="0"></use></g></g><g><use xlink:href="#aFWcwFIax" opacity="1" fill="url(#gradientaIMror5Zz)"></use><g><use xlink:href="#aFWcwFIax" opacity="1" fill-opacity="0" stroke="#000000" stroke-width="1" stroke-opacity="0"></use></g></g><g><use xlink:href="#e1RZG6bOc" opacity="1" fill="#29abe2" fill-opacity="1"></use><g><use xlink:href="#e1RZG6bOc" opacity="1" fill-opacity="0" stroke="#000000" stroke-width="1" stroke-opacity="0"></use></g></g></g></svg>`;
// #endregion

customElements.define('ii-login-button', IILoginButton);
