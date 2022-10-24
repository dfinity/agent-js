export class LoginButton extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });

    // internal styles
    const style = document.createElement('style');

    const columns = this.hasAttribute('logo-right')
      ? `grid-template-columns: auto 36px;`
      : `grid-template-columns: 36px auto;`;
    style.textContent = `
  button {
    box-sizing: border-box;
    display: grid;
    background: white;
    ${columns}
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
  }

  connectedCallback() {
    const login = this.login.bind(this);
    this.shadowRoot?.querySelector('button')?.addEventListener('click', login);
  }

  attributeChangedCallback(attrName: string, oldVal: unknown, newVal: unknown) {
    switch (attrName) {
      case 'disabled': {
        (this.shadowRoot?.querySelector('button') as HTMLButtonElement).disabled =
          newVal === 'true';
        break;
      }
      case 'label': {
        (this.shadowRoot?.querySelector('slot[name="label"]') as HTMLSpanElement).innerText =
          newVal as string;
        break;
      }
      case 'innerstyle': {
        this.shadowRoot?.querySelector('button')?.setAttribute('style', newVal as string);
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

  login(): void {
    console.log('unimplimented');
  }
}
