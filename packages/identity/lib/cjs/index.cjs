'use strict';
var __createBinding =
  (this && this.__createBinding) ||
  (Object.create
    ? function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        var desc = Object.getOwnPropertyDescriptor(m, k);
        if (!desc || ('get' in desc ? !m.__esModule : desc.writable || desc.configurable)) {
          desc = {
            enumerable: true,
            get: function () {
              return m[k];
            },
          };
        }
        Object.defineProperty(o, k2, desc);
      }
    : function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        o[k2] = m[k];
      });
var __exportStar =
  (this && this.__exportStar) ||
  function (m, exports) {
    for (var p in m)
      if (p !== 'default' && !Object.prototype.hasOwnProperty.call(exports, p))
        __createBinding(exports, m, p);
  };
Object.defineProperty(exports, '__esModule', { value: true });
exports.Secp256k1KeyIdentity =
  exports.ED25519_OID =
  exports.DER_COSE_OID =
  exports.unwrapDER =
  exports.wrapDER =
  exports.WebAuthnIdentity =
  exports.Ed25519PublicKey =
  exports.Ed25519KeyIdentity =
    void 0;
var ed25519_js_1 = require('./identity/ed25519.js');
Object.defineProperty(exports, 'Ed25519KeyIdentity', {
  enumerable: true,
  get: function () {
    return ed25519_js_1.Ed25519KeyIdentity;
  },
});
Object.defineProperty(exports, 'Ed25519PublicKey', {
  enumerable: true,
  get: function () {
    return ed25519_js_1.Ed25519PublicKey;
  },
});
__exportStar(require('./identity/ecdsa.js'), exports);
__exportStar(require('./identity/delegation.js'), exports);
var webauthn_js_1 = require('./identity/webauthn.js');
Object.defineProperty(exports, 'WebAuthnIdentity', {
  enumerable: true,
  get: function () {
    return webauthn_js_1.WebAuthnIdentity;
  },
});
var der_js_1 = require('./identity/der.js');
Object.defineProperty(exports, 'wrapDER', {
  enumerable: true,
  get: function () {
    return der_js_1.wrapDER;
  },
});
Object.defineProperty(exports, 'unwrapDER', {
  enumerable: true,
  get: function () {
    return der_js_1.unwrapDER;
  },
});
Object.defineProperty(exports, 'DER_COSE_OID', {
  enumerable: true,
  get: function () {
    return der_js_1.DER_COSE_OID;
  },
});
Object.defineProperty(exports, 'ED25519_OID', {
  enumerable: true,
  get: function () {
    return der_js_1.ED25519_OID;
  },
});
/**
 * @deprecated due to size of dependencies. Use `@dfinity/identity-secp256k1` instead.
 */
class Secp256k1KeyIdentity {
  constructor() {
    throw new Error(
      'Secp256k1KeyIdentity has been moved to a new repo: @dfinity/identity-secp256k1',
    );
  }
}
exports.Secp256k1KeyIdentity = Secp256k1KeyIdentity;
//# sourceMappingURL=index.js.map
