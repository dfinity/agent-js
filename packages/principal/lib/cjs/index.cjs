'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.Principal = void 0;
const base32_js_1 = require('./utils/base32.js');
const getCrc_js_1 = require('./utils/getCrc.js');
const sha224_js_1 = require('./utils/sha224.js');
const SELF_AUTHENTICATING_SUFFIX = 2;
const ANONYMOUS_SUFFIX = 4;
const MANAGEMENT_CANISTER_PRINCIPAL_HEX_STR = 'aaaaa-aa';
const fromHexString = hexString => {
  var _a;
  return new Uint8Array(
    ((_a = hexString.match(/.{1,2}/g)) !== null && _a !== void 0 ? _a : []).map(byte =>
      parseInt(byte, 16),
    ),
  );
};
const toHexString = bytes =>
  bytes.reduce((str, byte) => str + byte.toString(16).padStart(2, '0'), '');
class Principal {
  constructor(_arr) {
    this._arr = _arr;
    this._isPrincipal = true;
    this._arr = _arr;
  }
  static anonymous() {
    return new this(new Uint8Array([ANONYMOUS_SUFFIX]));
  }
  /**
   * Utility method, returning the principal representing the management canister, decoded from the hex string `'aaaaa-aa'`
   * @returns {Principal} principal of the management canister
   */
  static managementCanister() {
    return this.fromHex(MANAGEMENT_CANISTER_PRINCIPAL_HEX_STR);
  }
  static selfAuthenticating(publicKey) {
    const sha = (0, sha224_js_1.sha224)(publicKey);
    return new this(new Uint8Array([...sha, SELF_AUTHENTICATING_SUFFIX]));
  }
  static from(other) {
    if (typeof other === 'string') {
      return Principal.fromText(other);
    } else if (typeof other === 'object' && other !== null && other._isPrincipal === true) {
      return new Principal(other._arr);
    }
    throw new Error(`Impossible to convert ${JSON.stringify(other)} to Principal.`);
  }
  static fromHex(hex) {
    return new this(fromHexString(hex));
  }
  static fromText(text) {
    const canisterIdNoDash = text.toLowerCase().replace(/-/g, '');
    let arr = (0, base32_js_1.decode)(canisterIdNoDash);
    arr = arr.slice(4, arr.length);
    const principal = new this(arr);
    if (principal.toText() !== text) {
      throw new Error(
        `Principal "${principal.toText()}" does not have a valid checksum (original value "${text}" may not be a valid Principal ID).`,
      );
    }
    return principal;
  }
  static fromUint8Array(arr) {
    return new this(arr);
  }
  isAnonymous() {
    return this._arr.byteLength === 1 && this._arr[0] === ANONYMOUS_SUFFIX;
  }
  toUint8Array() {
    return this._arr;
  }
  toHex() {
    return toHexString(this._arr).toUpperCase();
  }
  toText() {
    const checksumArrayBuf = new ArrayBuffer(4);
    const view = new DataView(checksumArrayBuf);
    view.setUint32(0, (0, getCrc_js_1.getCrc32)(this._arr));
    const checksum = new Uint8Array(checksumArrayBuf);
    const bytes = Uint8Array.from(this._arr);
    const array = new Uint8Array([...checksum, ...bytes]);
    const result = (0, base32_js_1.encode)(array);
    const matches = result.match(/.{1,5}/g);
    if (!matches) {
      // This should only happen if there's no character, which is unreachable.
      throw new Error();
    }
    return matches.join('-');
  }
  toString() {
    return this.toText();
  }
  /**
   * Utility method taking a Principal to compare against. Used for determining canister ranges in certificate verification
   * @param {Principal} other - a {@link Principal} to compare
   * @returns {'lt' | 'eq' | 'gt'} `'lt' | 'eq' | 'gt'` a string, representing less than, equal to, or greater than
   */
  compareTo(other) {
    const otherPrincipal = Principal.from(other);
    for (let i = 0; i < Math.min(this._arr.length, otherPrincipal._arr.length); i++) {
      if (this._arr[i] < otherPrincipal._arr[i]) return 'lt';
      else if (this._arr[i] > otherPrincipal._arr[i]) return 'gt';
    }
    // Here, at least one principal is a prefix of the other principal (they could be the same)
    if (this._arr.length < otherPrincipal._arr.length) return 'lt';
    if (this._arr.length > otherPrincipal._arr.length) return 'gt';
    return 'eq';
  }
  /**
   * Utility method checking whether a provided Principal is less than or equal to the current one using the {@link Principal.compareTo} method
   * @param other a {@link Principal} to compare
   * @returns {boolean} boolean
   */
  ltEq(other) {
    const cmp = this.compareTo(other);
    return cmp == 'lt' || cmp == 'eq';
  }
  /**
   * Utility method checking whether a provided Principal is greater than or equal to the current one using the {@link Principal.compareTo} method
   * @param other a {@link Principal} to compare
   * @returns {boolean} boolean
   */
  gtEq(other) {
    const cmp = this.compareTo(other);
    return cmp == 'gt' || cmp == 'eq';
  }
}
exports.Principal = Principal;
//# sourceMappingURL=index.js.map
