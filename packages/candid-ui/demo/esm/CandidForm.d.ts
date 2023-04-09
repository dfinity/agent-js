import { Agent, HttpAgent, Identity } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
export declare class CandidForm extends HTMLElement {
  #private;
  constructor();
  /**
   * Public Interface
   */
  attributeChangedCallback(): void;
  static get observedAttributes(): string[];
  /**
   * setter for host
   */
  set host(host: string | undefined);
  get host(): string | undefined;
  set title(title: string);
  get title(): string;
  set description(description: string);
  get description(): string;
  set methods(methods: string[]);
  get methods(): string[];
  /**
   * functional setter method for canister id for Candid UI to display
   * @param canisterId - canister id
   */
  setCanisterId(canisterId?: Principal | string): void;
  /**
   * The canister id for Candid UI to display
   */
  set canisterId(canisterId: Principal | string | undefined);
  get canisterId(): Principal | string | undefined;
  /**
   * Setter method for an agent
   * @param agent - an instance of HttpAgent or Agent
   */
  setAgent(agent: Agent | HttpAgent): Promise<void>;
  set agent(agent: Agent | HttpAgent);
  get agent(): Agent | HttpAgent;
  setIdentity(identity: Identity | undefined): Promise<void>;
  set identity(identity: Identity | undefined);
  get identity(): Identity | undefined;
  /**
   * Reset Candid UI
   */
  reset: () => void;
  connectedCallback(): Promise<void>;
}
/**
 * Define the custom element
 */
export declare function defineCandidFormElement(): void;
