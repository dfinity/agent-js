import * as cbor from './cbor';
import { AgentError } from './errors';
import { hash } from './request_id';
import { concat, fromHex, toHex } from './utils/buffer';
import { Principal } from '@dfinity/principal';
import * as bls from './utils/bls';
import { decodeTime } from './utils/leb';

/**
 * A certificate may fail verification with respect to the provided public key
 */
export class CertificateVerificationError extends AgentError {
  constructor(reason: string) {
    super(`Invalid certificate: ${reason}`);
  }
}

export interface Cert {
  tree: HashTree;
  signature: ArrayBuffer;
  delegation?: Delegation;
}

const NodeId = {
  Empty: 0,
  Fork: 1,
  Labeled: 2,
  Leaf: 3,
  Pruned: 4,
};

export type NodeIdType = typeof NodeId[keyof typeof NodeId];

export { NodeId };

export type HashTree =
  | [typeof NodeId.Empty]
  | [typeof NodeId.Fork, HashTree, HashTree]
  | [typeof NodeId.Labeled, ArrayBuffer, HashTree]
  | [typeof NodeId.Leaf, ArrayBuffer]
  | [typeof NodeId.Pruned, ArrayBuffer];

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
      if (tree[1] instanceof Array && tree[2] instanceof ArrayBuffer) {
        const left = hashTreeToString(tree[1]);
        const right = hashTreeToString(tree[2]);
        return `sub(\n left:\n${indent(left)}\n---\n right:\n${indent(right)}\n)`;
      } else {
        throw new Error('Invalid tree structure for fork');
      }
    }
    case NodeId.Labeled: {
      if (tree[1] instanceof ArrayBuffer && tree[2] instanceof ArrayBuffer) {
        const label = labelToString(tree[1]);
        const sub = hashTreeToString(tree[2]);
        return `label(\n label:\n${indent(label)}\n sub:\n${indent(sub)}\n)`;
      } else {
        throw new Error('Invalid tree structure for labeled');
      }
    }
    case NodeId.Leaf: {
      if (!tree[1]) {
        throw new Error('Invalid tree structure for leaf');
      } else if (Array.isArray(tree[1])) {
        return JSON.stringify(tree[1]);
      }
      return `leaf(...${tree[1].byteLength} bytes)`;
    }
    case NodeId.Pruned: {
      if (!tree[1]) {
        throw new Error('Invalid tree structure for pruned');
      } else if (Array.isArray(tree[1])) {
        return JSON.stringify(tree[1]);
      }

      return `pruned(${toHex(new Uint8Array(tree[1]))}`;
    }
    default: {
      return `unknown(${JSON.stringify(tree[0])})`;
    }
  }
}

interface Delegation extends Record<string, unknown> {
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

type VerifyFunc = (pk: Uint8Array, sig: Uint8Array, msg: Uint8Array) => Promise<boolean> | boolean;

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

  /**
   * The maximum age of the certificate in minutes. Default is 5 minutes.
   * @default 5
   * This is used to verify the time the certificate was signed, particularly for validating Delegation certificates, which can live for longer than the default window of +/- 5 minutes. If the certificate is
   * older than the specified age, it will fail verification.
   */
  maxAgeInMinutes?: number;
}

export class Certificate {
  private readonly cert: Cert;

  /**
   * Create a new instance of a certificate, automatically verifying it. Throws a
   * CertificateVerificationError if the certificate cannot be verified.
   * @constructs  Certificate
   * @param {CreateCertificateOptions} options {@link CreateCertificateOptions}
   * @param {ArrayBuffer} options.certificate The bytes of the certificate
   * @param {ArrayBuffer} options.rootKey The root key to verify against
   * @param {Principal} options.canisterId The effective or signing canister ID
   * @param {number} options.maxAgeInMinutes The maximum age of the certificate in minutes. Default is 5 minutes.
   * @throws {CertificateVerificationError}
   */
  public static async create(options: CreateCertificateOptions): Promise<Certificate> {
    const cert = Certificate.createUnverified(options);

    await cert.verify();
    return cert;
  }

  private static createUnverified(options: CreateCertificateOptions): Certificate {
    let blsVerify = options.blsVerify;
    if (!blsVerify) {
      blsVerify = bls.blsVerify;
    }
    return new Certificate(
      options.certificate,
      options.rootKey,
      options.canisterId,
      blsVerify,
      options.maxAgeInMinutes,
    );
  }

  private constructor(
    certificate: ArrayBuffer,
    private _rootKey: ArrayBuffer,
    private _canisterId: Principal,
    private _blsVerify: VerifyFunc,
    // Default to 5 minutes
    private _maxAgeInMinutes: number = 5,
  ) {
    this.cert = cbor.decode(new Uint8Array(certificate));
  }

  public lookup(path: Array<ArrayBuffer | string>): ArrayBuffer | undefined {
    // constrain the type of the result, so that empty HashTree is undefined
    return lookupResultToBuffer(lookup_path(path, this.cert.tree));
  }

  public lookup_label(label: ArrayBuffer): ArrayBuffer | HashTree | undefined {
    return this.lookup([label]);
  }

  private async verify(): Promise<void> {
    const rootHash = await reconstruct(this.cert.tree);
    const derKey = await this._checkDelegationAndGetKey(this.cert.delegation);
    const sig = this.cert.signature;
    const key = extractDER(derKey);
    const msg = concat(domain_sep('ic-state-root'), rootHash);
    let sigVer = false;

    const lookupTime = this.lookup(['time']);
    if (!lookupTime) {
      // Should never happen - time is always present in IC certificates
      throw new CertificateVerificationError('Certificate does not contain a time');
    }

    const FIVE_MINUTES_IN_MSEC = 5 * 60 * 1000;
    const MAX_AGE_IN_MSEC = this._maxAgeInMinutes * 60 * 1000;
    const now = Date.now();
    const earliestCertificateTime = now - MAX_AGE_IN_MSEC;
    const fiveMinutesFromNow = now + FIVE_MINUTES_IN_MSEC;

    const certTime = decodeTime(lookupTime);

    if (certTime.getTime() < earliestCertificateTime) {
      throw new CertificateVerificationError(
        `Certificate is signed more than ${this._maxAgeInMinutes} minutes in the past. Certificate time: ` +
          certTime.toISOString() +
          ' Current time: ' +
          new Date(now).toISOString(),
      );
    } else if (certTime.getTime() > fiveMinutesFromNow) {
      throw new CertificateVerificationError(
        'Certificate is signed more than 5 minutes in the future. Certificate time: ' +
          certTime.toISOString() +
          ' Current time: ' +
          new Date(now).toISOString(),
      );
    }

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

    const cert: Certificate = await Certificate.createUnverified({
      certificate: d.certificate,
      rootKey: this._rootKey,
      canisterId: this._canisterId,
      blsVerify: this._blsVerify,
      // Do not check max age for delegation certificates
      maxAgeInMinutes: Infinity,
    });

    if (cert.cert.delegation) {
      throw new CertificateVerificationError('Delegation certificates cannot be nested');
    }

    await cert.verify();

    const canisterInRange = check_canister_ranges({
      canisterId: this._canisterId,
      subnetId: Principal.fromUint8Array(new Uint8Array(d.subnet_id)),
      tree: cert.cert.tree,
    });
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
 * utility function to constrain the type of a path
 * @param {ArrayBuffer | HashTree | undefined} result - the result of a lookup
 * @returns ArrayBuffer or Undefined
 */
export function lookupResultToBuffer(
  result: ArrayBuffer | HashTree | undefined,
): ArrayBuffer | undefined {
  if (result instanceof ArrayBuffer) {
    return result;
  } else if (result instanceof Uint8Array) {
    return result.buffer;
  }
  return undefined;
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
): ArrayBuffer | HashTree | undefined {
  if (path.length === 0) {
    switch (tree[0]) {
      case NodeId.Leaf: {
        // should not be undefined
        if (!tree[1]) throw new Error('Invalid tree structure for leaf');
        if (tree[1] instanceof ArrayBuffer) {
          return tree[1];
        } else if (tree[1] instanceof Uint8Array) {
          return tree[1].buffer;
        } else return tree[1];
      }
      case NodeId.Fork: {
        return tree;
      }
      default: {
        return tree;
      }
    }
  }

  const label = typeof path[0] === 'string' ? new TextEncoder().encode(path[0]) : path[0];
  const t = find_label(label, flatten_forks(tree));
  if (t) {
    return lookup_path(path.slice(1), t);
  }
}

/**
 * If the tree is a fork, flatten it into an array of trees
 * @param t - the tree to flatten
 * @returns HashTree[] - the flattened tree
 */
export function flatten_forks(t: HashTree): HashTree[] {
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

/**
 * Check if a canister falls within a range of canisters
 * @param canisterId Principal
 * @param ranges [Principal, Principal][]
 * @returns
 */
export function check_canister_ranges(params: {
  canisterId: Principal;
  subnetId: Principal;
  tree: HashTree;
}): boolean {
  const { canisterId, subnetId, tree } = params;
  const rangeLookup = lookup_path(['subnet', subnetId.toUint8Array(), 'canister_ranges'], tree);

  if (!rangeLookup || !(rangeLookup instanceof ArrayBuffer)) {
    throw new Error(`Could not find canister ranges for subnet ${subnetId}`);
  }

  const ranges_arr: Array<[Uint8Array, Uint8Array]> = cbor.decode(rangeLookup);
  const ranges: Array<[Principal, Principal]> = ranges_arr.map(v => [
    Principal.fromUint8Array(v[0]),
    Principal.fromUint8Array(v[1]),
  ]);

  const canisterInRange = ranges.some(r => r[0].ltEq(canisterId) && r[1].gtEq(canisterId));

  return canisterInRange;
}
