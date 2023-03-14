export abstract class AbstractPrincipal {
  readonly _isPrincipal = true;
  abstract isAnonymous(): boolean;
  abstract toUint8Array(): Uint8Array;
  abstract toHex(): string;
  abstract toText(): string;
  abstract toString(): string;
  /**
   * Utility method taking a Principal to compare against. Used for determining canister ranges in certificate verification
   * @param {Principal} other - a {@link Principal} to compare
   * @returns {'lt' | 'eq' | 'gt'} `'lt' | 'eq' | 'gt'` a string, representing less than, equal to, or greater than
   */
  abstract compareTo(other: AbstractPrincipal): 'lt' | 'eq' | 'gt';
  /**
   * Utility method checking whether a provided Principal is less than or equal to the current one using the {@link Principal.compareTo} method
   * @param other a {@link Principal} to compare
   * @returns {boolean} boolean
   */
  abstract ltEq(other: AbstractPrincipal): boolean;
  /**
   * Utility method checking whether a provided Principal is greater than or equal to the current one using the {@link Principal.compareTo} method
   * @param other a {@link Principal} to compare
   * @returns {boolean} boolean
   */
  abstract gtEq(other: AbstractPrincipal): boolean;
}
