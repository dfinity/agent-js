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
exports.isDelegationValid =
  exports.DelegationIdentity =
  exports.DelegationChain =
  exports.Delegation =
    void 0;
const agent_1 = require('@dfinity/agent');
const principal_1 = require('@dfinity/principal');
const cbor = __importStar(require('simple-cbor'));
const buffer_js_1 = require('../buffer.js');
const domainSeparator = new TextEncoder().encode('\x1Aic-request-auth-delegation');
const requestDomainSeparator = new TextEncoder().encode('\x0Aic-request');
function _parseBlob(value) {
  if (typeof value !== 'string' || value.length < 64) {
    throw new Error('Invalid public key.');
  }
  return (0, buffer_js_1.fromHexString)(value);
}
/**
 * A single delegation object that is signed by a private key. This is constructed by
 * `DelegationChain.create()`.
 *
 * {@see DelegationChain}
 */
class Delegation {
  constructor(pubkey, expiration, targets) {
    this.pubkey = pubkey;
    this.expiration = expiration;
    this.targets = targets;
  }
  toCBOR() {
    // Expiration field needs to be encoded as a u64 specifically.
    return cbor.value.map(
      Object.assign(
        {
          pubkey: cbor.value.bytes(this.pubkey),
          expiration: cbor.value.u64(this.expiration.toString(16), 16),
        },
        this.targets && {
          targets: cbor.value.array(this.targets.map(t => cbor.value.bytes(t.toUint8Array()))),
        },
      ),
    );
  }
  toJSON() {
    // every string should be hex and once-de-hexed,
    // discoverable what it is (e.g. de-hex to get JSON with a 'type' property, or de-hex to DER
    // with an OID). After de-hex, if it's not obvious what it is, it's an ArrayBuffer.
    return Object.assign(
      {
        expiration: this.expiration.toString(16),
        pubkey: (0, buffer_js_1.toHexString)(this.pubkey),
      },
      this.targets && { targets: this.targets.map(p => p.toHex()) },
    );
  }
}
exports.Delegation = Delegation;
/**
 * Sign a single delegation object for a period of time.
 *
 * @param from The identity that lends its delegation.
 * @param to The identity that receives the delegation.
 * @param expiration An expiration date for this delegation.
 * @param targets Limit this delegation to the target principals.
 */
async function _createSingleDelegation(from, to, expiration, targets) {
  const delegation = new Delegation(
    to.toDer(),
    BigInt(+expiration) * BigInt(1000000), // In nanoseconds.
    targets,
  );
  // The signature is calculated by signing the concatenation of the domain separator
  // and the message.
  // Note: To ensure Safari treats this as a user gesture, ensure to not use async methods
  // besides the actualy webauthn functionality (such as `sign`). Safari will de-register
  // a user gesture if you await an async call thats not fetch, xhr, or setTimeout.
  const challenge = new Uint8Array([
    ...domainSeparator,
    ...new Uint8Array((0, agent_1.requestIdOf)(delegation)),
  ]);
  const signature = await from.sign(challenge);
  return {
    delegation,
    signature,
  };
}
/**
 * A chain of delegations. This is JSON Serializable.
 * This is the object to serialize and pass to a DelegationIdentity. It does not keep any
 * private keys.
 */
class DelegationChain {
  constructor(delegations, publicKey) {
    this.delegations = delegations;
    this.publicKey = publicKey;
  }
  /**
   * Create a delegation chain between two (or more) keys. By default, the expiration time
   * will be very short (15 minutes).
   *
   * To build a chain of more than 2 identities, this function needs to be called multiple times,
   * passing the previous delegation chain into the options argument. For example:
   *
   * @example
   * const rootKey = createKey();
   * const middleKey = createKey();
   * const bottomeKey = createKey();
   *
   * const rootToMiddle = await DelegationChain.create(
   *   root, middle.getPublicKey(), Date.parse('2100-01-01'),
   * );
   * const middleToBottom = await DelegationChain.create(
   *   middle, bottom.getPublicKey(), Date.parse('2100-01-01'), { previous: rootToMiddle },
   * );
   *
   * // We can now use a delegation identity that uses the delegation above:
   * const identity = DelegationIdentity.fromDelegation(bottomKey, middleToBottom);
   *
   * @param from The identity that will delegate.
   * @param to The identity that gets delegated. It can now sign messages as if it was the
   *           identity above.
   * @param expiration The length the delegation is valid. By default, 15 minutes from calling
   *                   this function.
   * @param options A set of options for this delegation. expiration and previous
   * @param options.previous - Another DelegationChain that this chain should start with.
   * @param options.targets - targets that scope the delegation (e.g. Canister Principals)
   */
  static async create(from, to, expiration = new Date(Date.now() + 15 * 60 * 1000), options = {}) {
    var _a, _b;
    const fromIdentity = from;
    const delegation = await _createSingleDelegation(fromIdentity, to, expiration, options.targets);
    return new DelegationChain(
      [
        ...(((_a = options.previous) === null || _a === void 0 ? void 0 : _a.delegations) || []),
        delegation,
      ],
      ((_b = options.previous) === null || _b === void 0 ? void 0 : _b.publicKey) ||
        from.getPublicKey().toDer(),
    );
  }
  /**
   * Creates a DelegationChain object from a JSON string.
   *
   * @param json The JSON string to parse.
   */
  static fromJSON(json) {
    const { publicKey, delegations } = typeof json === 'string' ? JSON.parse(json) : json;
    if (!Array.isArray(delegations)) {
      throw new Error('Invalid delegations.');
    }
    const parsedDelegations = delegations.map(signedDelegation => {
      const { delegation, signature } = signedDelegation;
      const { pubkey, expiration, targets } = delegation;
      if (targets !== undefined && !Array.isArray(targets)) {
        throw new Error('Invalid targets.');
      }
      return {
        delegation: new Delegation(
          _parseBlob(pubkey),
          BigInt(`0x${expiration}`), // expiration in JSON is an hexa string (See toJSON() below).
          targets &&
            targets.map(t => {
              if (typeof t !== 'string') {
                throw new Error('Invalid target.');
              }
              return principal_1.Principal.fromHex(t);
            }),
        ),
        signature: _parseBlob(signature),
      };
    });
    return new this(parsedDelegations, _parseBlob(publicKey));
  }
  /**
   * Creates a DelegationChain object from a list of delegations and a DER-encoded public key.
   *
   * @param delegations The list of delegations.
   * @param publicKey The DER-encoded public key of the key-pair signing the first delegation.
   */
  static fromDelegations(delegations, publicKey) {
    return new this(delegations, publicKey);
  }
  toJSON() {
    return {
      delegations: this.delegations.map(signedDelegation => {
        const { delegation, signature } = signedDelegation;
        const { targets } = delegation;
        return {
          delegation: Object.assign(
            {
              expiration: delegation.expiration.toString(16),
              pubkey: (0, buffer_js_1.toHexString)(delegation.pubkey),
            },
            targets && {
              targets: targets.map(t => t.toHex()),
            },
          ),
          signature: (0, buffer_js_1.toHexString)(signature),
        };
      }),
      publicKey: (0, buffer_js_1.toHexString)(this.publicKey),
    };
  }
}
exports.DelegationChain = DelegationChain;
/**
 * An Identity that adds delegation to a request. Everywhere in this class, the name
 * innerKey refers to the SignIdentity that is being used to sign the requests, while
 * originalKey is the identity that is being borrowed. More identities can be used
 * in the middle to delegate.
 */
class DelegationIdentity extends agent_1.SignIdentity {
  constructor(_inner, _delegation) {
    super();
    this._inner = _inner;
    this._delegation = _delegation;
  }
  /**
   * Create a delegation without having access to delegateKey.
   *
   * @param key The key used to sign the reqyests.
   * @param delegation A delegation object created using `createDelegation`.
   */
  static fromDelegation(key, delegation) {
    const identity = key;
    return new this(identity, delegation);
  }
  getDelegation() {
    return this._delegation;
  }
  getPublicKey() {
    return {
      toDer: () => this._delegation.publicKey,
    };
  }
  sign(blob) {
    return this._inner.sign(blob);
  }
  async transformRequest(request) {
    const { body } = request,
      fields = __rest(request, ['body']);
    const requestId = await (0, agent_1.requestIdOf)(body);
    return Object.assign(Object.assign({}, fields), {
      body: {
        content: body,
        sender_sig: await this.sign(
          new Uint8Array([...requestDomainSeparator, ...new Uint8Array(requestId)]),
        ),
        sender_delegation: this._delegation.delegations,
        sender_pubkey: this._delegation.publicKey,
      },
    });
  }
}
exports.DelegationIdentity = DelegationIdentity;
/**
 * Analyze a DelegationChain and validate that it's valid, ie. not expired and apply to the
 * scope.
 * @param chain The chain to validate.
 * @param checks Various checks to validate on the chain.
 */
function isDelegationValid(chain, checks) {
  // Verify that the no delegation is expired. If any are in the chain, returns false.
  for (const { delegation } of chain.delegations) {
    // prettier-ignore
    if (+new Date(Number(delegation.expiration / BigInt(1000000))) <= +Date.now()) {
            return false;
        }
  }
  // Check the scopes.
  const scopes = [];
  const maybeScope = checks === null || checks === void 0 ? void 0 : checks.scope;
  if (maybeScope) {
    if (Array.isArray(maybeScope)) {
      scopes.push(
        ...maybeScope.map(s => (typeof s === 'string' ? principal_1.Principal.fromText(s) : s)),
      );
    } else {
      scopes.push(
        typeof maybeScope === 'string' ? principal_1.Principal.fromText(maybeScope) : maybeScope,
      );
    }
  }
  for (const s of scopes) {
    const scope = s.toText();
    for (const { delegation } of chain.delegations) {
      if (delegation.targets === undefined) {
        continue;
      }
      let none = true;
      for (const target of delegation.targets) {
        if (target.toText() === scope) {
          none = false;
          break;
        }
      }
      if (none) {
        return false;
      }
    }
  }
  return true;
}
exports.isDelegationValid = isDelegationValid;
//# sourceMappingURL=delegation.js.map
