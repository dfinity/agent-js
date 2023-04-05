import { Principal } from '@dfinity/principal';
import { css, html } from './utils';

export class CanisterIdInput extends HTMLElement {
  _canisterId?: Principal;
  _onChange?: (canisterId: Principal | undefined) => void;
  _error?: string;
  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });

    const style = document.createElement('style');
    style.innerHTML = css`
      label {
        margin-right: 0.5rem;
      }
      input {
        border: none;
        width: 12rem;
      }
      button[type='submit'] {
        display: none;
      }
      form:focus-within button[type='submit'] {
        display: inline;
        margin-left: 1rem;
      }
    `;
    shadow.appendChild(style);

    const form = document.createElement('form');
    form.id = 'form';
    shadow.appendChild(form);

    const handleSubmit = this.handleSubmit.bind(this);
    form.onsubmit = handleSubmit;
  }

  async connectedCallback() {
    this.init();
  }

  async init() {
    const value = this.getAttribute('canisterId');
    if (value) {
      try {
        this._canisterId = Principal.fromText(value);
      } catch (error) {
        console.error(error);
      }
    }

    this.render();
  }

  set onChange(cb: (id: Principal | undefined) => void) {
    console.count('onChange');
    this._onChange = cb;
    this.render();
  }

  handleSubmit = (event: Event) => {
    console.count('handleSubmit');
    event.preventDefault();
    const shadowRoot = this.shadowRoot;
    if (!shadowRoot) return;
    const form = shadowRoot.querySelector('form') as HTMLFormElement;

    const input = form.querySelector('input') as HTMLInputElement;
    try {
      const canisterId = Principal.fromText(input.value);
      this._error = undefined;
      if (this._onChange) {
        this._onChange(canisterId);
      }
    } catch (error) {
      console.error();
      this._error = (error as Error).message;
    }

    return false;
  };

  async render() {
    const shadowRoot = this.shadowRoot;
    if (!shadowRoot) return;
    const form = shadowRoot.querySelector('form') as HTMLFormElement;
    form.innerHTML = html` <label for="canister">Canister Id:</label
      ><input id="canister" name="canister" /><button type="submit" class="btn">Submit</button>`;
    const input = form.querySelector('input') as HTMLInputElement;
    if (this._canisterId) {
      input.value = this._canisterId.toText();
    } else {
      setTimeout(() => {
        input.focus();
      }, 100);
    }

    input.addEventListener('change', () => {
      try {
        // will throw an error if input is invalid
        Principal.fromText(input.value);
        input.setCustomValidity('');
      } catch (error) {
        input.setCustomValidity('Please enter a valid canister ID.');
      }
    });
  }

  attributeChangedCallback() {
    console.log('attribute changed');
    this.init();
  }

  static get observedAttributes() {
    return ['canisterid', 'onchange'];
  }
}

/**
 * Defines the canister-input custom element.
 */
export function defineCanisterIdInput() {
  if (!window.customElements.get('canister-input')) {
    customElements.define('canister-input', CanisterIdInput);
  } else {
    console.warn('candid-form already defined');
  }
}
