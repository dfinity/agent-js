import * as cbor from './cbor';
import { AgentError } from './errors';
import { hash } from './request_id';
import { compare, concat, fromHex, toHex } from './utils/buffer';
import { Principal } from '@dfinity/principal';
import * as bls from './utils/bls';
import { decodeLeb128, decodeTime } from './utils/leb';
import { lebDecode, PipeArrayBuffer } from '@dfinity/candid';
import { assert } from 'console';

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
  #nodeKeys: string[] = [];

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
    let blsVerify = options.blsVerify;
    if (!blsVerify) {
      blsVerify = bls.blsVerify;
    }
    const cert = new Certificate(
      options.certificate,
      options.rootKey,
      options.canisterId,
      blsVerify,
      options.maxAgeInMinutes,
    );
    await cert.verify();
    return cert;
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

  public lookup(path: Array<ArrayBuffer | string>): ArrayBuffer | HashTree | undefined {
    return lookup_path(path, this.cert.tree);
  }

  public lookup_label(label: ArrayBuffer): ArrayBuffer | HashTree | undefined {
    return this.lookup([label]);
  }

  public cache_node_keys(root_key?: Uint8Array): string[] {
    const tree = this.cert.tree;
    let delegation = this.cert.delegation;
    // On local replica, with System type subnet, there is no delegation
    if (!delegation && typeof root_key !== 'undefined') {
      delegation = {
        subnet_id: Principal.selfAuthenticating(root_key).toUint8Array(),
        certificate: new ArrayBuffer(0),
      };
    }
    // otherwise use default NNS subnet id
    else if (!delegation) {
      delegation = {
        subnet_id: Principal.fromText(
          'tdb26-jop6k-aogll-7ltgs-eruif-6kk7m-qpktf-gdiqx-mxtrf-vb5e6-eqe',
        ).toUint8Array(),
        certificate: new ArrayBuffer(0),
      };
    }

    delegation;
    // Map principals into a readable format, with the subnet id as the key
    let iter = 0;

    const nodeTree = lookup_path(['subnet', delegation?.subnet_id as ArrayBuffer, 'node'], tree);
    const nodeForks = flatten_forks(nodeTree as HashTree) as HashTree[];
    nodeForks.length;

    this.#nodeKeys = nodeForks.map(fork => {
      iter++;
      const derEncodedPublicKey = lookup_path(['public_key'], fork[2] as HashTree) as ArrayBuffer;
      if (derEncodedPublicKey.byteLength !== 44) {
        throw new Error('Invalid public key length');
      } else {
        return toHex(derEncodedPublicKey);
      }
    });

    return this.#nodeKeys;
  }

  // turn the certificate into a JavaScript object
  public parse(): Record<string, any> {
    // utf-8 decoder
    const decoder = new TextDecoder();
    const tree = this.cert.tree;
    const signature = this.cert.signature;
    const delegation = this.cert.delegation;
    const result: Record<string, any> = {};
    if (delegation) {
      result.delegation = delegation;
    }

    result.signature = toHex(new Uint8Array(signature));

    const subnet_id = this.lookup(['subnet']) as HashTree;
    const subnet_forks = flatten_forks(subnet_id) as HashTree[];
    // Map principals into a readable format, with the subnet id as the key
    let iter = 0;

    const nodeTree = lookup_path(['subnet', delegation?.subnet_id as ArrayBuffer, 'node'], tree);
    const nodeForks = flatten_forks(nodeTree as HashTree) as HashTree[];
    nodeForks.length;

    const hexNodeKeys = nodeForks.map(fork => {
      iter++;
      const derEncodedPublicKey = lookup_path(['public_key'], fork[2] as HashTree) as ArrayBuffer;
      if (derEncodedPublicKey.byteLength !== 44) {
        throw new Error('Invalid public key length');
      } else {
        return toHex(derEncodedPublicKey);
      }
    });

    hexNodeKeys; //?

    iter;
    // const mapped = subnet_forks.reduce((start, next) => {
    //   if (next[2]) {
    //     const idBuffer = new Uint8Array(next[1] as ArrayBuffer);
    //     const textId = Principal.fromUint8Array(idBuffer).toText();

    //     textId;

    //     const nodeTree = lookup_path(
    //       ['subnet', delegation?.subnet_id as ArrayBuffer, 'node'],
    //       tree,
    //     );
    //     const nodeForks = flatten_forks(nodeTree as HashTree) as HashTree[];
    //     nodeForks.length;

    //     toHex(new Uint8Array(public_key as ArrayBuffer)); //?

    //     start[textId] = next[2];
    //   }
    //   return start;
    // }, {} as Record<string, HashTree>);
    iter;
    try {
      toHex(new Uint8Array(subnet_forks[0][1] as ArrayBuffer)); //?
      Principal.fromUint8Array(new Uint8Array(subnet_forks[0][1] as ArrayBuffer)).toText(); //?
    } catch (error) {
      console.log(error);
    }

    // subnet_forks.forEach(fork => {
    //   const label = new Uint8Array(fork[1] as ArrayBuffer); //?

    // });

    // recursively parse the tree using flatten_forks
    // to get a list of all the nodes in the tree

    // de all ArrayBuffer values
    const process_node = (node: HashTree): Record<string, any> => {
      const result: Record<string, any> = {};

      switch (node[0]) {
        case NodeId.Empty:
          result.type = 'empty';
          break;
        case NodeId.Fork:
          result.type = 'fork';
          result.left = process_node(node[1] as HashTree);
          result.right = process_node(node[2] as HashTree);

          break;
        case NodeId.Labeled:
          result.type = 'labeled';
          result.label = toHex(new Uint8Array(node[1] as ArrayBuffer));
          result.sub = process_node(node[2] as HashTree);
          break;
        case NodeId.Leaf:
          result.type = 'leaf';
          result.data = toHex(new Uint8Array(node[1] as ArrayBuffer));
          break;
        case NodeId.Pruned:
          result.type = 'pruned';
          result.data = toHex(new Uint8Array(node[1] as ArrayBuffer));
          break;
        default:
          throw new Error('unreachable');
      }

      return result;
    };

    result.tree = process_node(tree);
    return result;
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

    const cert: Certificate = await Certificate.create({
      certificate: d.certificate,
      rootKey: this._rootKey,
      canisterId: this._canisterId,
      blsVerify: this._blsVerify,
      // Maximum age of 30 days for delegation certificates
      maxAgeInMinutes: 60 * 24 * 30,
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
): ArrayBuffer | HashTree | undefined {
  if (path.length === 0) {
    switch (tree[0]) {
      case NodeId.Leaf: {
        return new Uint8Array(tree[1]).buffer;
      }
      case NodeId.Fork: {
        return tree;
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
