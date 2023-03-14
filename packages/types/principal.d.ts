export abstract class AbstractPrincipal {
  static anonymous(): AbstractPrincipal;
  /**
   * Utility method, returning the principal representing the management canister, decoded from the hex string `'aaaaa-aa'`
   * @returns {AbstractPrincipal} principal of the management canister
   */
  static managementCanister(): AbstractPrincipal;
  static selfAuthenticating(publicKey: Uint8Array): AbstractPrincipal;
  static from(other: unknown): AbstractPrincipal;
  static fromHex(hex: string): AbstractPrincipal;
  static fromText(text: string): AbstractPrincipal;
  static fromUint8Array(arr: Uint8Array): AbstractPrincipal;
  readonly _isPrincipal = true;
  isAnonymous(): boolean;
  toUint8Array(): Uint8Array;
  toHex(): string;
  toText(): string;
  toString(): string;
  /**
   * Utility method taking a Principal to compare against. Used for determining canister ranges in certificate verification
   * @param {Principal} other - a {@link Principal} to compare
   * @returns {'lt' | 'eq' | 'gt'} `'lt' | 'eq' | 'gt'` a string, representing less than, equal to, or greater than
   */
  compareTo(other: AbstractPrincipal): 'lt' | 'eq' | 'gt';
  /**
   * Utility method checking whether a provided Principal is less than or equal to the current one using the {@link Principal.compareTo} method
   * @param other a {@link Principal} to compare
   * @returns {boolean} boolean
   */
  ltEq(other: AbstractPrincipal): boolean;
  /**
   * Utility method checking whether a provided Principal is greater than or equal to the current one using the {@link Principal.compareTo} method
   * @param other a {@link Principal} to compare
   * @returns {boolean} boolean
   */
  gtEq(other: AbstractPrincipal): boolean;
}
