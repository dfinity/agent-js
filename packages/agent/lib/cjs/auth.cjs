'use strict';
var __rest =
  (this && this.__rest) ||
  function (s, e) {
    var t = {};
    for (var p in s)
      if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0) t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === 'function')
      for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
        if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
          t[p[i]] = s[p[i]];
      }
    return t;
  };
Object.defineProperty(exports, '__esModule', { value: true });
exports.AnonymousIdentity = exports.SignIdentity = exports.createIdentityDescriptor = void 0;
const types_1 = require('@dfinity/types');
const buffer_js_1 = require('./utils/buffer.js');
const principal_1 = require('@dfinity/principal');
const request_id_js_1 = require('./request_id.js');
const domainSeparator = new TextEncoder().encode('\x0Aic-request');
/**
 * Create an IdentityDescriptor from a @dfinity/identity Identity
 * @param identity - identity describe in returned descriptor
 */
function createIdentityDescriptor(identity) {
  const identityIndicator =
    'getPublicKey' in identity
      ? {
          type: 'PublicKeyIdentity',
          publicKey: (0, buffer_js_1.toHex)(identity.getPublicKey().toDer()),
        }
      : { type: 'AnonymousIdentity' };
  return identityIndicator;
}
exports.createIdentityDescriptor = createIdentityDescriptor;
/**
 * An Identity that can sign blobs.
 */
class SignIdentity extends types_1.AbstractSignIdentity {
  /**
   * Get the principal represented by this identity. Normally should be a
   * `Principal.selfAuthenticating()`.
   */
  getPrincipal() {
    if (!this._principal) {
      this._principal = principal_1.Principal.selfAuthenticating(
        new Uint8Array(this.getPublicKey().toDer()),
      );
    }
    return this._principal;
  }
  /**
   * Transform a request into a signed version of the request. This is done last
   * after the transforms on the body of a request. The returned object can be
   * anything, but must be serializable to CBOR.
   * @param request - internet computer request to transform
   */
  async transformRequest(request) {
    const { body } = request,
      fields = __rest(request, ['body']);
    const requestId = await (0, request_id_js_1.requestIdOf)(body);
    return Object.assign(Object.assign({}, fields), {
      body: {
        content: body,
        sender_pubkey: this.getPublicKey().toDer(),
        sender_sig: await this.sign((0, buffer_js_1.concat)(domainSeparator, requestId)),
      },
    });
  }
}
exports.SignIdentity = SignIdentity;
class AnonymousIdentity extends types_1.AbstractIdentity {
  getPrincipal() {
    return principal_1.Principal.anonymous();
  }
  async transformRequest(request) {
    return Object.assign(Object.assign({}, request), { body: { content: request.body } });
  }
}
exports.AnonymousIdentity = AnonymousIdentity;
//# sourceMappingURL=auth.js.map
