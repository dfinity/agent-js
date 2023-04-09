import { Principal } from '@dfinity/principal';
import { css, html } from './utils';
export class CanisterIdInput extends HTMLElement {
  constructor() {
    super();
    this.handleSubmit = event => {
      console.count('handleSubmit');
      event.preventDefault();
      const shadowRoot = this.shadowRoot;
      if (!shadowRoot) return;
      const form = shadowRoot.querySelector('form');
      const input = form.querySelector('input');
      try {
        const canisterId = Principal.fromText(input.value);
        this._error = undefined;
        if (this._onChange) {
          this._onChange(canisterId);
        }
      } catch (error) {
        console.error();
        this._error = error.message;
      }
      return false;
    };
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
        padding: 0 1rem;
      }
      form:focus-within button[type='submit'] {
        display: inline;
        margin-left: 1rem;
      }
      .btn {
        font-family: 'Roboto', sans-serif;
        letter-spacing: 0.05rem;
        background-color: var(--darkest);
        color: var(--lightest);
        font-size: var(--font-md);
        border: none;
        text-transform: uppercase;
        flex: 1;
      }
      .btn:not(:last-child) {
        margin-right: var(--pad-md);
      }
      button {
        padding: 0;
        border: none;
        background-color: inherit;
        color: inherit;
        padding: 0.4rem;
        border: 1px solid black;
        font-size: var(--font-sm);
        line-height: 1.5rem;
      }
      button:focus,
      input:focus,
      select:focus,
      textarea:focus {
        outline: 2px transparent solid;
        box-shadow: 0 0 0 2px #f9f9d1, 0 0 0 4px #396196, 0 0 4px 8px #f9f9d1;
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
  set onChange(cb) {
    console.count('onChange');
    this._onChange = cb;
  }
  async render() {
    const shadowRoot = this.shadowRoot;
    if (!shadowRoot) return;
    const form = shadowRoot.querySelector('form');
    form.innerHTML = html` <label for="canister">Canister Id:</label
      ><input id="canister" name="canister" /><button type="submit" class="btn">Set</button>`;
    const input = form.querySelector('input');
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
