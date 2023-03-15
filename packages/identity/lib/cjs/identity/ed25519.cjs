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
var __setModuleDefault =
  (this && this.__setModuleDefault) ||
  (Object.create
    ? function (o, v) {
        Object.defineProperty(o, 'default', { enumerable: true, value: v });
      }
    : function (o, v) {
        o['default'] = v;
      });
var __importStar =
  (this && this.__importStar) ||
  function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null)
      for (var k in mod)
        if (k !== 'default' && Object.prototype.hasOwnProperty.call(mod, k))
          __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
  };
Object.defineProperty(exports, '__esModule', { value: true });
exports.Ed25519KeyIdentity = exports.Ed25519PublicKey = void 0;
const agent_1 = require('@dfinity/agent');
const tweetnacl = __importStar(require('tweetnacl'));
const buffer_js_1 = require('../buffer.js');
const der_js_1 = require('./der.js');
class Ed25519PublicKey {
  // `fromRaw` and `fromDer` should be used for instantiation, not this constructor.
  constructor(key) {
    this.rawKey = key;
    this.derKey = Ed25519PublicKey.derEncode(key);
  }
  static from(key) {
    return this.fromDer(key.toDer());
  }
  static fromRaw(rawKey) {
    return new Ed25519PublicKey(rawKey);
  }
  static fromDer(derKey) {
    return new Ed25519PublicKey(this.derDecode(derKey));
  }
  static derEncode(publicKey) {
    return (0, der_js_1.wrapDER)(publicKey, der_js_1.ED25519_OID).buffer;
  }
  static derDecode(key) {
    const unwrapped = (0, der_js_1.unwrapDER)(key, der_js_1.ED25519_OID);
    if (unwrapped.length !== this.RAW_KEY_LENGTH) {
      throw new Error('An Ed25519 public key must be exactly 32bytes long');
    }
    return unwrapped;
  }
  toDer() {
    return this.derKey;
  }
  toRaw() {
    return this.rawKey;
  }
}
exports.Ed25519PublicKey = Ed25519PublicKey;
// The length of Ed25519 public keys is always 32 bytes.
Ed25519PublicKey.RAW_KEY_LENGTH = 32;
class Ed25519KeyIdentity extends agent_1.SignIdentity {
  // `fromRaw` and `fromDer` should be used for instantiation, not this constructor.
  constructor(publicKey, _privateKey) {
    super();
    this._privateKey = _privateKey;
    this._publicKey = Ed25519PublicKey.from(publicKey);
  }
  static generate(seed) {
    if (seed && seed.length !== 32) {
      throw new Error('Ed25519 Seed needs to be 32 bytes long.');
    }
    const { publicKey, secretKey } =
      seed === undefined ? tweetnacl.sign.keyPair() : tweetnacl.sign.keyPair.fromSeed(seed);
    return new this(Ed25519PublicKey.fromRaw(publicKey), secretKey);
  }
  static fromParsedJson(obj) {
    const [publicKeyDer, privateKeyRaw] = obj;
    return new Ed25519KeyIdentity(
      Ed25519PublicKey.fromDer((0, buffer_js_1.fromHexString)(publicKeyDer)),
      (0, buffer_js_1.fromHexString)(privateKeyRaw),
    );
  }
  static fromJSON(json) {
    const parsed = JSON.parse(json);
    if (Array.isArray(parsed)) {
      if (typeof parsed[0] === 'string' && typeof parsed[1] === 'string') {
        return this.fromParsedJson([parsed[0], parsed[1]]);
      } else {
        throw new Error('Deserialization error: JSON must have at least 2 items.');
      }
    }
    throw new Error(`Deserialization error: Invalid JSON type for string: ${JSON.stringify(json)}`);
  }
  static fromKeyPair(publicKey, privateKey) {
    return new Ed25519KeyIdentity(Ed25519PublicKey.fromRaw(publicKey), privateKey);
  }
  static fromSecretKey(secretKey) {
    const keyPair = tweetnacl.sign.keyPair.fromSecretKey(new Uint8Array(secretKey));
    return Ed25519KeyIdentity.fromKeyPair(keyPair.publicKey, keyPair.secretKey);
  }
  /**
   * Serialize this key to JSON.
   */
  toJSON() {
    return [
      (0, buffer_js_1.toHexString)(this._publicKey.toDer()),
      (0, buffer_js_1.toHexString)(this._privateKey),
    ];
  }
  /**
   * Return a copy of the key pair.
   */
  getKeyPair() {
    return {
      secretKey: this._privateKey,
      publicKey: this._publicKey,
    };
  }
  /**
   * Return the public key.
   */
  getPublicKey() {
    return this._publicKey;
  }
  /**
   * Signs a blob of data, with this identity's private key.
   * @param challenge - challenge to sign with this identity's secretKey, producing a signature
   */
  async sign(challenge) {
    const blob = new Uint8Array(challenge);
    const signature = tweetnacl.sign.detached(blob, new Uint8Array(this._privateKey)).buffer;
    return signature;
  }
}
exports.Ed25519KeyIdentity = Ed25519KeyIdentity;
//# sourceMappingURL=ed25519.js.map
