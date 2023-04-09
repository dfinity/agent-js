import { Principal } from '@dfinity/principal';
export declare class CanisterIdInput extends HTMLElement {
  _canisterId?: Principal;
  _onChange?: (canisterId: Principal | undefined) => void;
  _error?: string;
  constructor();
  connectedCallback(): Promise<void>;
  init(): Promise<void>;
  set onChange(cb: (id: Principal | undefined) => void);
  handleSubmit: (event: Event) => false | undefined;
  render(): Promise<void>;
  attributeChangedCallback(): void;
  static get observedAttributes(): string[];
}
/**
 * Defines the canister-input custom element.
 */
export declare function defineCanisterIdInput(): void;
