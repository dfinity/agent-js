import * as cbor from './cbor';
import { AgentError } from './errors';
import { hash } from './request_id';
import { concat, fromHex, toHex } from './utils/buffer';
import { Principal } from '@dfinity/principal';
import * as bls from './utils/bls';

/**
 * A certificate may fail verification with respect to the provided public key
 */
export class CertificateVerificationError extends AgentError {
  constructor(reason: string) {
    super(`Invalid certificate: ${reason}`);
  }
}

interface Cert {
  tree: HashTree;
  signature: ArrayBuffer;
  delegation?: Delegation;
}

const enum NodeId {
  Empty = 0,
  Fork = 1,
  Labeled = 2,
  Leaf = 3,
  Pruned = 4,
}

export type HashTree =
  | [NodeId.Empty]
  | [NodeId.Fork, HashTree, HashTree]
  | [NodeId.Labeled, ArrayBuffer, HashTree]
  | [NodeId.Leaf, ArrayBuffer]
  | [NodeId.Pruned, ArrayBuffer];

/**
 * Make a human readable string out of a hash tree.
 * @param tree
 */
export function hashTreeToString(tree: HashTree): string {
  const indent = (s: string) =>
    s
      .split('\n')
      .map(x => '  ' + x)
      .join('\n');
  function labelToString(label: ArrayBuffer): string {
    const decoder = new TextDecoder(undefined, { fatal: true });
    try {
      return JSON.stringify(decoder.decode(label));
    } catch (e) {
      return `data(...${label.byteLength} bytes)`;
    }
  }

  switch (tree[0]) {
    case NodeId.Empty:
      return '()';
    case NodeId.Fork: {
      const left = hashTreeToString(tree[1]);
      const right = hashTreeToString(tree[2]);
      return `sub(\n left:\n${indent(left)}\n---\n right:\n${indent(right)}\n)`;
    }
    case NodeId.Labeled: {
      const label = labelToString(tree[1]);
      const sub = hashTreeToString(tree[2]);
      return `label(\n label:\n${indent(label)}\n sub:\n${indent(sub)}\n)`;
    }
    case NodeId.Leaf: {
      return `leaf(...${tree[1].byteLength} bytes)`;
    }
    case NodeId.Pruned: {
      return `pruned(${toHex(new Uint8Array(tree[1]))}`;
    }
    default: {
      return `unknown(${JSON.stringify(tree[0])})`;
    }
  }
}

interface Delegation extends Record<string, any> {
  subnet_id: ArrayBuffer;
  certificate: ArrayBuffer;
}

function isBufferEqual(a: ArrayBuffer, b: ArrayBuffer): boolean {
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

type VerifyFunc = (pk: Uint8Array, sig: Uint8Array, msg: Uint8Array) => Promise<boolean>;

export interface CreateCertificateOptions {
  /**
   * The bytes encoding the certificate to be verified
   */
  certificate: ArrayBuffer;
  /**
   * The root key against which to verify the certificate
   * (normally, the root key of the IC main network)
   */
  rootKey: ArrayBuffer;
  /**
   * The effective canister ID of the request when verifying a response, or
   * the signing canister ID when verifying a certified variable.
   */
  canisterId: Principal;
  /**
   * BLS Verification strategy. Default strategy uses wasm for performance, but that may not be available in all contexts.
   */
  blsVerify?: VerifyFunc;
}

export class Certificate {
  private readonly cert: Cert;

  /**
   * Create a new instance of a certificate, automatically verifying it. Throws a
   * CertificateVerificationError if the certificate cannot be verified.
   * @constructs {@link AuthClient}
   * @param {CreateCertificateOptions} options
   * @see {@link CreateCertificateOptions}
   * @param {ArrayBuffer} options.certificate The bytes of the certificate
   * @param {ArrayBuffer} options.rootKey The root key to verify against
   * @param {Principal} options.canisterId The effective or signing canister ID
   * @throws {CertificateVerificationError}
   */
  public static async create(options: CreateCertificateOptions): Promise<Certificate> {
    let blsVerify = options.blsVerify;
    if (!blsVerify) {
      blsVerify = bls.blsVerify;
    }
    const cert = new Certificate(
      options.certificate,
      options.rootKey,
      options.canisterId,
      blsVerify,
    );
    await cert.verify();
    return cert;
  }

  private constructor(
    certificate: ArrayBuffer,
    private _rootKey: ArrayBuffer,
    private _canisterId: Principal,
    private _blsVerify: VerifyFunc,
  ) {
    this.cert = cbor.decode(new Uint8Array(certificate));
  }

  public lookup(path: Array<ArrayBuffer | string>): ArrayBuffer | undefined {
    return lookup_path(path, this.cert.tree);
  }

  private async verify(): Promise<void> {
    const rootHash = await reconstruct(this.cert.tree);
    const derKey = await this._checkDelegationAndGetKey(this.cert.delegation);
    const sig = this.cert.signature;
    const key = extractDER(derKey);
    const msg = concat(domain_sep('ic-state-root'), rootHash);
    let sigVer = false;
    try {
      sigVer = await this._blsVerify(new Uint8Array(key), new Uint8Array(sig), new Uint8Array(msg));
    } catch (err) {
      sigVer = false;
    }
    if (!sigVer) {
      throw new CertificateVerificationError('Signature verification failed');
    }
  }

  private async _checkDelegationAndGetKey(d?: Delegation): Promise<ArrayBuffer> {
    if (!d) {
      return this._rootKey;
    }
    const cert: Certificate = await Certificate.create({
      certificate: d.certificate,
      rootKey: this._rootKey,
      canisterId: this._canisterId,
    });

    const rangeLookup = cert.lookup(['subnet', d.subnet_id, 'canister_ranges']);
    if (!rangeLookup) {
      throw new CertificateVerificationError(
        `Could not find canister ranges for subnet 0x${toHex(d.subnet_id)}`,
      );
    }
    const ranges_arr: Array<[Uint8Array, Uint8Array]> = cbor.decode(rangeLookup);
    const ranges: Array<[Principal, Principal]> = ranges_arr.map(v => [
      Principal.fromUint8Array(v[0]),
      Principal.fromUint8Array(v[1]),
    ]);

    const canisterInRange = ranges.some(
      r => r[0].ltEq(this._canisterId) && r[1].gtEq(this._canisterId),
    );
    if (!canisterInRange) {
      throw new CertificateVerificationError(
        `Canister ${this._canisterId} not in range of delegations for subnet 0x${toHex(
          d.subnet_id,
        )}`,
      );
    }
    const publicKeyLookup = cert.lookup(['subnet', d.subnet_id, 'public_key']);
    if (!publicKeyLookup) {
      throw new Error(`Could not find subnet key for subnet 0x${toHex(d.subnet_id)}`);
    }
    return publicKeyLookup;
  }
}

const DER_PREFIX = fromHex(
  '308182301d060d2b0601040182dc7c0503010201060c2b0601040182dc7c05030201036100',
);
const KEY_LENGTH = 96;

function extractDER(buf: ArrayBuffer): ArrayBuffer {
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
export async function reconstruct(t: HashTree): Promise<ArrayBuffer> {
  switch (t[0]) {
    case NodeId.Empty:
      return hash(domain_sep('ic-hashtree-empty'));
    case NodeId.Pruned:
      return t[1] as ArrayBuffer;
    case NodeId.Leaf:
      return hash(concat(domain_sep('ic-hashtree-leaf'), t[1] as ArrayBuffer));
    case NodeId.Labeled:
      return hash(
        concat(
          domain_sep('ic-hashtree-labeled'),
          t[1] as ArrayBuffer,
          await reconstruct(t[2] as HashTree),
        ),
      );
    case NodeId.Fork:
      return hash(
        concat(
          domain_sep('ic-hashtree-fork'),
          await reconstruct(t[1] as HashTree),
          await reconstruct(t[2] as HashTree),
        ),
      );
    default:
      throw new Error('unreachable');
  }
}

function domain_sep(s: string): ArrayBuffer {
  const len = new Uint8Array([s.length]);
  const str = new TextEncoder().encode(s);
  return concat(len, str);
}

/**
 * @param path
 * @param tree
 */
export function lookup_path(
  path: Array<ArrayBuffer | string>,
  tree: HashTree,
): ArrayBuffer | undefined {
  if (path.length === 0) {
    switch (tree[0]) {
      case NodeId.Leaf: {
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
function flatten_forks(t: HashTree): HashTree[] {
  switch (t[0]) {
    case NodeId.Empty:
      return [];
    case NodeId.Fork:
      return flatten_forks(t[1] as HashTree).concat(flatten_forks(t[2] as HashTree));
    default:
      return [t];
  }
}
function find_label(l: ArrayBuffer, trees: HashTree[]): HashTree | undefined {
  if (trees.length === 0) {
    return undefined;
  }
  for (const t of trees) {
    if (t[0] === NodeId.Labeled) {
      const p = t[1] as ArrayBuffer;
      if (isBufferEqual(l, p)) {
        return t[2];
      }
    }
  }
}
