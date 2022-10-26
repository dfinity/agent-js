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
const iiLogo = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" class="w-8 h-8" viewBox="-1 -1 107.425 54.66"><defs><path id="a" d="M59.62 9.14c-3.14 2.85-5.9 5.93-7.91 8.39 0 0 3.24 3.65 6.78 7.56 1.92-2.37 4.68-5.58 7.87-8.48 5.9-5.41 9.74-6.5 11.97-6.5 8.31 0 15.04 6.81 15.04 15.24 0 8.35-6.73 15.16-15.04 15.25-.39 0-.87-.05-1.44-.18 2.4 1.1 5.03 1.89 7.48 1.89 15.21 0 18.18-10.28 18.35-11.03.44-1.89.7-3.86.7-5.88C103.38 11.38 92.15 0 78.33 0c-5.77 0-12.06 3.08-18.71 9.14Z"/><path id="c" d="M43.8 41.52c3.15-2.86 5.9-5.93 7.91-8.39 0 0-3.23-3.65-6.77-7.56-1.93 2.37-4.68 5.58-7.87 8.48-5.9 5.36-9.79 6.5-11.98 6.5-8.3 0-15.04-6.81-15.04-15.24 0-8.35 6.74-15.16 15.04-15.25.39 0 .88.05 1.44.18-2.4-1.1-5.02-1.89-7.47-1.89C3.85 8.35.87 18.63.7 19.38c-.44 1.89-.7 3.86-.7 5.88 0 14.02 11.23 25.4 25.09 25.4 5.77 0 12.07-3.08 18.71-9.14Z"/><path id="e" d="M19.1 8.57C5.24 8.23 1.16 18.1.81 19.37 3.47 8.3 13.37.04 25.14 0c9.59 0 19.29 9.21 26.45 17.53.01-.02.02-.03.03-.04 0 0 3.24 3.64 6.78 7.55 0 0 4.02 4.66 8.31 8.75 1.66 1.58 9.74 7.95 17.52 8.17 14.26.4 18.19-10.02 18.41-10.81-2.62 11.12-12.55 19.42-24.35 19.47-9.6 0-19.3-9.22-26.49-17.54-.02.02-.03.03-.04.05 0 0-3.24-3.65-6.78-7.56 0 0-4.02-4.66-8.3-8.74-1.67-1.58-9.8-8.04-17.58-8.26ZM.81 19.37c-.01.03-.02.06-.02.09 0-.02.01-.05.02-.09Z"/><linearGradient id="b" x1="65.17" x2="99.9" y1="3.67" y2="39.44" gradientUnits="userSpaceOnUse"><stop offset="21%" stop-color="#f15a24"/><stop offset="68.41%" stop-color="#fbb03b"/></linearGradient><linearGradient id="d" x1="38.22" x2="3.5" y1="46.97" y2="11.2" gradientUnits="userSpaceOnUse"><stop offset="21%" stop-color="#ed1e79"/><stop offset="89.29%" stop-color="#522785"/></linearGradient></defs><use xlink:href="#a" fill="url(#b)"/><use xlink:href="#a" fill-opacity="0" stroke="#000" stroke-opacity="0"/><use xlink:href="#c" fill="url(#d)"/><use xlink:href="#c" fill-opacity="0" stroke="#000" stroke-opacity="0"/><g><use xlink:href="#e" fill="#29abe2"/><use xlink:href="#e" fill-opacity="0" stroke="#000" stroke-opacity="0"/></g></svg>`;
// #endregion

customElements.define('ii-login-button', IILoginButton);
