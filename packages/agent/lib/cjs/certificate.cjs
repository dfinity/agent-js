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
exports.lookup_path =
  exports.reconstruct =
  exports.Certificate =
  exports.hashTreeToString =
  exports.CertificateVerificationError =
    void 0;
const cbor = __importStar(require('./cbor.js'));
const errors_js_1 = require('./errors.js');
const request_id_js_1 = require('./request_id.js');
const bls_js_1 = require('./utils/bls.js');
const buffer_js_1 = require('./utils/buffer.js');
const principal_1 = require('@dfinity/principal');
/**
 * A certificate may fail verification with respect to the provided public key
 */
class CertificateVerificationError extends errors_js_1.AgentError {
  constructor(reason) {
    super(`Invalid certificate: ${reason}`);
  }
}
exports.CertificateVerificationError = CertificateVerificationError;
/**
 * Make a human readable string out of a hash tree.
 * @param tree
 */
function hashTreeToString(tree) {
  const indent = s =>
    s
      .split('\n')
      .map(x => '  ' + x)
      .join('\n');
  function labelToString(label) {
    const decoder = new TextDecoder(undefined, { fatal: true });
    try {
      return JSON.stringify(decoder.decode(label));
    } catch (e) {
      return `data(...${label.byteLength} bytes)`;
    }
  }
  switch (tree[0]) {
    case 0 /* NodeId.Empty */:
      return '()';
    case 1 /* NodeId.Fork */: {
      const left = hashTreeToString(tree[1]);
      const right = hashTreeToString(tree[2]);
      return `sub(\n left:\n${indent(left)}\n---\n right:\n${indent(right)}\n)`;
    }
    case 2 /* NodeId.Labeled */: {
      const label = labelToString(tree[1]);
      const sub = hashTreeToString(tree[2]);
      return `label(\n label:\n${indent(label)}\n sub:\n${indent(sub)}\n)`;
    }
    case 3 /* NodeId.Leaf */: {
      return `leaf(...${tree[1].byteLength} bytes)`;
    }
    case 4 /* NodeId.Pruned */: {
      return `pruned(${(0, buffer_js_1.toHex)(new Uint8Array(tree[1]))}`;
    }
    default: {
      return `unknown(${JSON.stringify(tree[0])})`;
    }
  }
}
exports.hashTreeToString = hashTreeToString;
function isBufferEqual(a, b) {
  if (a.byteLength !== b.byteLength) {
    return false;
  }
  const a8 = new Uint8Array(a);
  const b8 = new Uint8Array(b);
  for (let i = 0; i < a8.length; i++) {
    if (a8[i] !== b8[i]) {
      return false;
    }
  }
  return true;
}
class Certificate {
  constructor(certificate, _rootKey, _canisterId) {
    this._rootKey = _rootKey;
    this._canisterId = _canisterId;
    this.cert = cbor.decode(new Uint8Array(certificate));
  }
  /**
   * Create a new instance of a certificate, automatically verifying it. Throws a
   * CertificateVerificationError if the certificate cannot be verified.
   * @constructs {@link AuthClient}
   * @param {CreateCertificateOptions} options
   * @see {@link CreateCertificateOptions}
   * @param {ArrayBuffer} options.certificate The bytes of the certificate
   * @param {ArrayBuffer} options.rootKey The root key to verify against
   * @param {AbstractPrincipal} options.canisterId The effective or signing canister ID
   * @throws {CertificateVerificationError}
   */
  static async create(options) {
    const cert = new Certificate(options.certificate, options.rootKey, options.canisterId);
    await cert.verify();
    return cert;
  }
  lookup(path) {
    return lookup_path(path, this.cert.tree);
  }
  async verify() {
    const rootHash = await reconstruct(this.cert.tree);
    const derKey = await this._checkDelegationAndGetKey(this.cert.delegation);
    const sig = this.cert.signature;
    const key = extractDER(derKey);
    const msg = (0, buffer_js_1.concat)(domain_sep('ic-state-root'), rootHash);
    let sigVer = false;
    try {
      sigVer = await (0, bls_js_1.blsVerify)(
        new Uint8Array(key),
        new Uint8Array(sig),
        new Uint8Array(msg),
      );
    } catch (err) {
      sigVer = false;
    }
    if (!sigVer) {
      throw new CertificateVerificationError('Signature verification failed');
    }
  }
  async _checkDelegationAndGetKey(d) {
    if (!d) {
      return this._rootKey;
    }
    const cert = await Certificate.create({
      certificate: d.certificate,
      rootKey: this._rootKey,
      canisterId: this._canisterId,
    });
    if (this._canisterId.compareTo(principal_1.Principal.managementCanister()) !== 'eq') {
      const rangeLookup = cert.lookup(['subnet', d.subnet_id, 'canister_ranges']);
      if (!rangeLookup) {
        throw new CertificateVerificationError(
          `Could not find canister ranges for subnet 0x${(0, buffer_js_1.toHex)(d.subnet_id)}`,
        );
      }
      const ranges_arr = cbor.decode(rangeLookup);
      const ranges = ranges_arr.map(v => [
        principal_1.Principal.fromUint8Array(v[0]),
        principal_1.Principal.fromUint8Array(v[1]),
      ]);
      const canisterInRange = ranges.some(
        r => r[0].ltEq(this._canisterId) && r[1].gtEq(this._canisterId),
      );
      if (!canisterInRange) {
        throw new CertificateVerificationError(
          `Canister ${this._canisterId} not in range of delegations for subnet 0x${(0,
          buffer_js_1.toHex)(d.subnet_id)}`,
        );
      }
    }
    const publicKeyLookup = cert.lookup(['subnet', d.subnet_id, 'public_key']);
    if (!publicKeyLookup) {
      throw new Error(
        `Could not find subnet key for subnet 0x${(0, buffer_js_1.toHex)(d.subnet_id)}`,
      );
    }
    return publicKeyLookup;
  }
}
exports.Certificate = Certificate;
const DER_PREFIX = (0, buffer_js_1.fromHex)(
  '308182301d060d2b0601040182dc7c0503010201060c2b0601040182dc7c05030201036100',
);
const KEY_LENGTH = 96;
function extractDER(buf) {
  const expectedLength = DER_PREFIX.byteLength + KEY_LENGTH;
  if (buf.byteLength !== expectedLength) {
    throw new TypeError(`BLS DER-encoded public key must be ${expectedLength} bytes long`);
  }
  const prefix = buf.slice(0, DER_PREFIX.byteLength);
  if (!isBufferEqual(prefix, DER_PREFIX)) {
    throw new TypeError(
      `BLS DER-encoded public key is invalid. Expect the following prefix: ${DER_PREFIX}, but get ${prefix}`,
    );
  }
  return buf.slice(DER_PREFIX.byteLength);
}
/**
 * @param t
 */
async function reconstruct(t) {
  switch (t[0]) {
    case 0 /* NodeId.Empty */:
      return (0, request_id_js_1.hash)(domain_sep('ic-hashtree-empty'));
    case 4 /* NodeId.Pruned */:
      return t[1];
    case 3 /* NodeId.Leaf */:
      return (0, request_id_js_1.hash)(
        (0, buffer_js_1.concat)(domain_sep('ic-hashtree-leaf'), t[1]),
      );
    case 2 /* NodeId.Labeled */:
      return (0, request_id_js_1.hash)(
        (0, buffer_js_1.concat)(domain_sep('ic-hashtree-labeled'), t[1], await reconstruct(t[2])),
      );
    case 1 /* NodeId.Fork */:
      return (0, request_id_js_1.hash)(
        (0, buffer_js_1.concat)(
          domain_sep('ic-hashtree-fork'),
          await reconstruct(t[1]),
          await reconstruct(t[2]),
        ),
      );
    default:
      throw new Error('unreachable');
  }
}
exports.reconstruct = reconstruct;
function domain_sep(s) {
  const len = new Uint8Array([s.length]);
  const str = new TextEncoder().encode(s);
  return (0, buffer_js_1.concat)(len, str);
}
/**
 * @param path
 * @param tree
 */
function lookup_path(path, tree) {
  if (path.length === 0) {
    switch (tree[0]) {
      case 3 /* NodeId.Leaf */: {
        return new Uint8Array(tree[1]).buffer;
      }
      default: {
        return undefined;
      }
    }
  }
  const label = typeof path[0] === 'string' ? new TextEncoder().encode(path[0]) : path[0];
  const t = find_label(label, flatten_forks(tree));
  if (t) {
    return lookup_path(path.slice(1), t);
  }
}
exports.lookup_path = lookup_path;
function flatten_forks(t) {
  switch (t[0]) {
    case 0 /* NodeId.Empty */:
      return [];
    case 1 /* NodeId.Fork */:
      return flatten_forks(t[1]).concat(flatten_forks(t[2]));
    default:
      return [t];
  }
}
function find_label(l, trees) {
  if (trees.length === 0) {
    return undefined;
  }
  for (const t of trees) {
    if (t[0] === 2 /* NodeId.Labeled */) {
      const p = t[1];
      if (isBufferEqual(l, p)) {
        return t[2];
      }
    }
  }
}
//# sourceMappingURL=certificate.js.map
