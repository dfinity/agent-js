'use strict';
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, '__esModule', { value: true });
exports.Secp256k1KeyIdentity = exports.Secp256k1PublicKey = void 0;
const agent_1 = require('@dfinity/agent');
const secp256k1_1 = __importDefault(require('secp256k1'));
const js_sha256_1 = require('js-sha256');
const tweetnacl_1 = require('tweetnacl');
const hdkey_js_1 = __importDefault(require('./hdkey.js'));
const bip39_1 = require('bip39');
const buffer_js_1 = require('./buffer.js');
const der_js_1 = require('./der.js');
class Secp256k1PublicKey {
  // `fromRaw` and `fromDer` should be used for instantiation, not this constructor.
  constructor(key) {
    key.byteLength;
    this.rawKey = key;
    this.derKey = Secp256k1PublicKey.derEncode(key);
  }
  /**
   * Construct Secp256k1PublicKey from an existing PublicKey
   * @param {PublicKey} key
   * @returns {Secp256k1PublicKey} Instance of Secp256k1PublicKey
   */
  static from(key) {
    return this.fromDer(key.toDer());
  }
  static fromRaw(rawKey) {
    return new Secp256k1PublicKey(rawKey);
  }
  static fromDer(derKey) {
    return new Secp256k1PublicKey(this.derDecode(derKey));
  }
  static derEncode(publicKey) {
    return (0, der_js_1.wrapDER)(publicKey, der_js_1.SECP256K1_OID).buffer;
  }
  static derDecode(key) {
    return (0, der_js_1.unwrapDER)(key, der_js_1.SECP256K1_OID);
  }
  toDer() {
    return this.derKey;
  }
  toRaw() {
    return this.rawKey;
  }
}
exports.Secp256k1PublicKey = Secp256k1PublicKey;
class Secp256k1KeyIdentity extends agent_1.SignIdentity {
  constructor(publicKey, _privateKey) {
    super();
    this._privateKey = _privateKey;
    this._publicKey = publicKey;
  }
  /**
   * Generates an identity. If a seed is provided, the keys are generated from the
   * seed according to BIP 0032. Otherwise, the key pair is randomly generated.
   * This method throws an error in case the seed is not 32 bytes long or invalid
   * for use as a private key.
   * @param {Uint8Array} seed the optional seed
   * @returns {Secp256k1KeyIdentity}
   */
  static generate(seed) {
    if (seed && seed.byteLength !== 32) {
      throw new Error('Secp256k1 Seed needs to be 32 bytes long.');
    }
    let privateKey;
    if (seed) {
      // private key from seed according to https://en.bitcoin.it/wiki/BIP_0032
      // master key generation:
      privateKey = seed;
      if (!secp256k1_1.default.privateKeyVerify(privateKey)) {
        throw new Error('The seed is invalid.');
      }
    } else {
      privateKey = new Uint8Array((0, tweetnacl_1.randomBytes)(32));
      while (!secp256k1_1.default.privateKeyVerify(privateKey)) {
        privateKey = new Uint8Array((0, tweetnacl_1.randomBytes)(32));
      }
    }
    const publicKeyRaw = secp256k1_1.default.publicKeyCreate(privateKey, false);
    const publicKey = Secp256k1PublicKey.fromRaw(publicKeyRaw);
    return new this(publicKey, privateKey);
  }
  static fromParsedJson(obj) {
    const [publicKeyRaw, privateKeyRaw] = obj;
    return new Secp256k1KeyIdentity(
      Secp256k1PublicKey.fromRaw((0, buffer_js_1.fromHexString)(publicKeyRaw)),
      (0, buffer_js_1.fromHexString)(privateKeyRaw),
    );
  }
  static fromJSON(json) {
    const parsed = JSON.parse(json);
    if (Array.isArray(parsed)) {
      if (typeof parsed[0] === 'string' && typeof parsed[1] === 'string') {
        return this.fromParsedJson([parsed[0], parsed[1]]);
      }
      throw new Error('Deserialization error: JSON must have at least 2 items.');
    }
    throw new Error(`Deserialization error: Invalid JSON type for string: ${JSON.stringify(json)}`);
  }
  /**
   * generates an identity from a public and private key. Please ensure that you are generating these keys securely and protect the user's private key
   * @param {ArrayBuffer} publicKey
   * @param {ArrayBuffer} privateKey
   * @returns {Secp256k1KeyIdentity}
   */
  static fromKeyPair(publicKey, privateKey) {
    return new Secp256k1KeyIdentity(Secp256k1PublicKey.fromRaw(publicKey), privateKey);
  }
  /**
   * generates an identity from an existing secret key, and is the correct method to generate an identity from a seed phrase. Please ensure you protect the user's private key.
   * @param {ArrayBuffer} secretKey
   * @returns {Secp256k1KeyIdentity}
   */
  static fromSecretKey(secretKey) {
    const publicKey = secp256k1_1.default.publicKeyCreate(new Uint8Array(secretKey), false);
    const identity = Secp256k1KeyIdentity.fromKeyPair(publicKey, new Uint8Array(secretKey));
    return identity;
  }
  /**
   * Generates an identity from a seed phrase. Use carefully - seed phrases should only be used in secure contexts, and you should avoid having users copying and pasting seed phrases as much as possible.
   * @param {string | string[]} seedPhrase - either an array of words or a string of words separated by spaces.
   * @param password - optional password to be used by bip39
   * @returns Secp256k1KeyIdentity
   */
  static fromSeedPhrase(seedPhrase, password) {
    // Convert to string for convenience
    const phrase = Array.isArray(seedPhrase) ? seedPhrase.join(' ') : seedPhrase;
    // Warn if provided phrase is not conventional
    if (phrase.split(' ').length < 12 || phrase.split(' ').length > 24) {
      console.warn(
        'Warning - an unusually formatted seed phrase has been provided. Decoding may not work as expected',
      );
    }
    const seed = (0, bip39_1.mnemonicToSeedSync)(phrase, password);
    const root = hdkey_js_1.default.fromMasterSeed(seed);
    const addrnode = root.derive("m/44'/223'/0'/0/0");
    return Secp256k1KeyIdentity.fromSecretKey(addrnode.privateKey);
  }
  /**
   * Serialize this key to JSON-serializable object.
   * @returns {JsonableSecp256k1Identity}
   */
  toJSON() {
    return [
      (0, buffer_js_1.toHexString)(this._publicKey.toRaw()),
      (0, buffer_js_1.toHexString)(this._privateKey),
    ];
  }
  /**
   * Return a copy of the key pair.
   * @returns {KeyPair}
   */
  getKeyPair() {
    return {
      secretKey: this._privateKey,
      publicKey: this._publicKey,
    };
  }
  /**
   * Return the public key.
   * @returns {Secp256k1PublicKey}
   */
  getPublicKey() {
    return this._publicKey;
  }
  /**
   * Signs a blob of data, with this identity's private key.
   * @param {ArrayBuffer} challenge - challenge to sign with this identity's secretKey, producing a signature
   * @returns {Promise<Signature>} signature
   */
  async sign(challenge) {
    const hash = js_sha256_1.sha256.create();
    hash.update(challenge);
    const signature = secp256k1_1.default.ecdsaSign(
      new Uint8Array(hash.digest()),
      new Uint8Array(this._privateKey),
    ).signature.buffer;
    return signature;
  }
}
exports.Secp256k1KeyIdentity = Secp256k1KeyIdentity;
exports.default = Secp256k1KeyIdentity;
//# sourceMappingURL=secp256k1.js.map
