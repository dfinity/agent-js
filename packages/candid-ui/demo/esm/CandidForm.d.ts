import { Identity } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
export declare type CandidFormOptions = {
  canisterId?: Principal;
  host?: string;
  identity?: Identity;
  title?: string;
  description?: string;
};
export declare class CandidForm extends HTMLElement {
  private _service?;
  private _identity?;
  private _db?;
  private _agent?;
  private _canisterId?;
  private _isLocal;
  private _host?;
  private _title?;
  private _description?;
  constructor(options?: CandidFormOptions);
  connectedCallback(): Promise<void>;
  set canisterId(canisterId: Principal);
  render: () => Promise<void>;
  renderStatic: () => void;
  renderCanisterIdInput: (error?: string) => void;
  getDidJsFromTmpHack: (canisterId: Principal) => Promise<string>;
  didToJs: (candid_source: string) => Promise<any>;
  initializeConsoleControls(): void;
}
/**
 * Define the custom element
 */
export declare function defineCandidFormElement(): void;
