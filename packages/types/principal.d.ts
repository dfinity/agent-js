export declare class Principal {
  private _arr;
  static anonymous(): Principal;
  /**
   * Utility method, returning the principal representing the management canister, decoded from the hex string `'aaaaa-aa'`
   * @returns {Principal} principal of the management canister
   */
  static managementCanister(): Principal;
  static selfAuthenticating(publicKey: Uint8Array): Principal;
  static from(other: unknown): Principal;
  static fromHex(hex: string): Principal;
  static fromText(text: string): Principal;
  static fromUint8Array(arr: Uint8Array): Principal;
  readonly _isPrincipal = true;
  protected constructor(_arr: Uint8Array);
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
  compareTo(other: Principal): 'lt' | 'eq' | 'gt';
  /**
   * Utility method checking whether a provided Principal is less than or equal to the current one using the {@link Principal.compareTo} method
   * @param other a {@link Principal} to compare
   * @returns {boolean} boolean
   */
  ltEq(other: Principal): boolean;
  /**
   * Utility method checking whether a provided Principal is greater than or equal to the current one using the {@link Principal.compareTo} method
   * @param other a {@link Principal} to compare
   * @returns {boolean} boolean
   */
  gtEq(other: Principal): boolean;
}
