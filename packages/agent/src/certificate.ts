import * as cbor from './cbor.ts';
import {
  CertificateHasTooManyDelegationsErrorCode,
  CertificateNotAuthorizedErrorCode,
  CertificateTimeErrorCode,
  CertificateVerificationErrorCode,
  DerKeyLengthMismatchErrorCode,
  DerPrefixMismatchErrorCode,
  ProtocolError,
  LookupErrorCode,
  TrustError,
  UnknownError,
  HashTreeDecodeErrorCode,
  UNREACHABLE_ERROR,
  MalformedLookupFoundValueErrorCode,
  MissingLookupValueErrorCode,
} from './errors.ts';
import { Principal } from '@dfinity/principal';
import * as bls from './utils/bls.ts';
import { decodeTime } from './utils/leb.ts';
import { MANAGEMENT_CANISTER_ID } from './agent/index.ts';
import { bytesToHex, concatBytes, hexToBytes, utf8ToBytes } from '@noble/hashes/utils';
import { uint8Equals } from './utils/buffer.ts';
import { sha256 } from '@noble/hashes/sha2';

const MINUTES_TO_MSEC = 60 * 1000;
const FIVE_MINUTES_IN_MSEC = 5 * MINUTES_TO_MSEC;

export interface Cert {
  tree: HashTree;
  signature: Uint8Array;
  delegation?: Delegation;
}

export enum NodeType {
  Empty = 0,
  Fork = 1,
  Labeled = 2,
  Leaf = 3,
  Pruned = 4,
}

export type NodePath = Array<Uint8Array | string>;
export type NodeLabel = Uint8Array & { __nodeLabel__: void };
export type NodeValue = Uint8Array & { __nodeValue__: void };
export type NodeHash = Uint8Array & { __nodeHash__: void };

export type EmptyHashTree = [NodeType.Empty];
export type ForkHashTree = [NodeType.Fork, HashTree, HashTree];
export type LabeledHashTree = [NodeType.Labeled, NodeLabel, HashTree];
export type LeafHashTree = [NodeType.Leaf, NodeValue];
export type PrunedHashTree = [NodeType.Pruned, NodeHash];

export type HashTree =
  | EmptyHashTree
  | ForkHashTree
  | LabeledHashTree
  | LeafHashTree
  | PrunedHashTree;

/**
 * Make a human readable string out of a hash tree.
 * @param tree The hash tree to convert to a string
 */
export function hashTreeToString(tree: HashTree): string {
  const indent = (s: string) =>
    s
      .split('\n')
      .map(x => '  ' + x)
      .join('\n');
  function labelToString(label: Uint8Array): string {
    const decoder = new TextDecoder(undefined, { fatal: true });
    try {
      return JSON.stringify(decoder.decode(label));
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (e) {
      return `data(...${label.byteLength} bytes)`;
    }
  }

  switch (tree[0]) {
    case NodeType.Empty:
      return '()';
    case NodeType.Fork: {
      if (tree[1] instanceof Array && tree[2] instanceof Uint8Array) {
        const left = hashTreeToString(tree[1]);
        const right = hashTreeToString(tree[2]);
        return `sub(\n left:\n${indent(left)}\n---\n right:\n${indent(right)}\n)`;
      } else {
        throw UnknownError.fromCode(new HashTreeDecodeErrorCode('Invalid tree structure for fork'));
      }
    }
    case NodeType.Labeled: {
      if (tree[1] instanceof Uint8Array && tree[2] instanceof Uint8Array) {
        const label = labelToString(tree[1]);
        const sub = hashTreeToString(tree[2]);
        return `label(\n label:\n${indent(label)}\n sub:\n${indent(sub)}\n)`;
      } else {
        throw UnknownError.fromCode(
          new HashTreeDecodeErrorCode('Invalid tree structure for labeled'),
        );
      }
    }
    case NodeType.Leaf: {
      if (!tree[1]) {
        throw UnknownError.fromCode(new HashTreeDecodeErrorCode('Invalid tree structure for leaf'));
      } else if (Array.isArray(tree[1])) {
        return JSON.stringify(tree[1]);
      }
      return `leaf(...${tree[1].byteLength} bytes)`;
    }
    case NodeType.Pruned: {
      if (!tree[1]) {
        throw UnknownError.fromCode(
          new HashTreeDecodeErrorCode('Invalid tree structure for pruned'),
        );
      } else if (Array.isArray(tree[1])) {
        return JSON.stringify(tree[1]);
      }

      return `pruned(${bytesToHex(new Uint8Array(tree[1]))}`;
    }
    default: {
      return `unknown(${JSON.stringify(tree[0])})`;
    }
  }
}

interface Delegation extends Record<string, unknown> {
  subnet_id: Uint8Array;
  certificate: Uint8Array;
}

function isBufferGreaterThan(a: Uint8Array, b: Uint8Array): boolean {
  for (let i = 0; i < a.length; i++) {
    if (a[i] > b[i]) {
      return true;
    }
  }
  return false;
}

type VerifyFunc = (pk: Uint8Array, sig: Uint8Array, msg: Uint8Array) => Promise<boolean> | boolean;

export interface CreateCertificateOptions {
  /**
   * The bytes encoding the certificate to be verified
   */
  certificate: Uint8Array;
  /**
   * The root key against which to verify the certificate
   * (normally, the root key of the IC main network)
   */
  rootKey: Uint8Array;
  /**
   * The effective canister ID of the request when verifying a response, or
   * the signing canister ID when verifying a certified variable.
   */
  canisterId: Principal;
  /**
   * BLS Verification strategy. Default strategy uses bls12_381 from @noble/curves
   */
  blsVerify?: VerifyFunc;

  /**
   * The maximum age of the certificate in minutes. Default is 5 minutes.
   * This is used to verify the time the certificate was signed, particularly for validating Delegation certificates, which can live for longer than the default window of +/- 5 minutes. If the certificate is
   * older than the specified age, it will fail verification.
   * @default 5
   */
  maxAgeInMinutes?: number;

  /**
   * Overrides the maxAgeInMinutes setting and skips comparing the client's time against the certificate. Used for scenarios where the machine's clock is known to be out of sync, or for inspecting expired certificates.
   * @default false
   */
  disableTimeVerification?: boolean;

  /**
   * The time difference in milliseconds between the client's clock and the IC network clock.
   * This is used to adjust the current time when verifying the certificate freshness.
   * @default 0
   */
  timeDiffMsecs?: number;
}

export class Certificate {
  public cert: Cert;
  #disableTimeVerification: boolean = false;

  /**
   * Create a new instance of a certificate, automatically verifying it.
   * @param {CreateCertificateOptions} options {@link CreateCertificateOptions}
   * @throws if the verification of the certificate fails
   */
  public static async create(options: CreateCertificateOptions): Promise<Certificate> {
    const cert = Certificate.createUnverified(options);

    await cert.verify(options.timeDiffMsecs ?? 0);
    return cert;
  }

  private static createUnverified(options: CreateCertificateOptions): Certificate {
    return new Certificate(
      options.certificate,
      options.rootKey,
      options.canisterId,
      options.blsVerify ?? bls.blsVerify,
      options.maxAgeInMinutes,
      options.disableTimeVerification,
    );
  }

  private constructor(
    certificate: Uint8Array,
    private _rootKey: Uint8Array,
    private _canisterId: Principal,
    private _blsVerify: VerifyFunc,
    private _maxAgeInMinutes: number = 5,
    disableTimeVerification: boolean = false,
  ) {
    this.#disableTimeVerification = disableTimeVerification;
    this.cert = cbor.decode(certificate);
  }

  /**
   * Lookup a path in the certificate tree, using {@link lookup_path}.
   * @param path The path to lookup.
   * @returns The result of the lookup.
   */
  public lookup_path(path: NodePath): LookupResult {
    return lookup_path(path, this.cert.tree);
  }

  /**
   * Lookup a subtree in the certificate tree, using {@link lookup_subtree}.
   * @param path The path to lookup.
   * @returns The result of the lookup.
   */
  public lookup_subtree(path: NodePath): SubtreeLookupResult {
    return lookup_subtree(path, this.cert.tree);
  }

  private async verify(timeDiffMsecs: number): Promise<void> {
    const rootHash = await reconstruct(this.cert.tree);
    const derKey = await this._checkDelegationAndGetKey(this.cert.delegation, timeDiffMsecs);
    const sig = this.cert.signature;
    const key = extractDER(derKey);
    const msg = concatBytes(domain_sep('ic-state-root'), rootHash);

    const lookupTime = lookupResultToBuffer(this.lookup_path(['time']));
    if (!lookupTime) {
      // Should never happen - time is always present in IC certificates
      throw ProtocolError.fromCode(
        new CertificateVerificationErrorCode('Certificate does not contain a time'),
      );
    }

    // Certificate time verification checks
    if (!this.#disableTimeVerification) {
      const maxAgeInMsec = this._maxAgeInMinutes * MINUTES_TO_MSEC;
      const now = new Date();
      const adjustedNow = now.getTime() + timeDiffMsecs;
      const earliestCertificateTime = adjustedNow - maxAgeInMsec;
      const latestCertificateTime = adjustedNow + FIVE_MINUTES_IN_MSEC;

      const certTime = decodeTime(lookupTime);

      if (certTime.getTime() < earliestCertificateTime) {
        throw TrustError.fromCode(
          new CertificateTimeErrorCode(this._maxAgeInMinutes, certTime, now, timeDiffMsecs, 'past'),
        );
      } else if (certTime.getTime() > latestCertificateTime) {
        throw TrustError.fromCode(
          new CertificateTimeErrorCode(5, certTime, now, timeDiffMsecs, 'future'),
        );
      }
    }

    try {
      const sigVer = await this._blsVerify(key, sig, msg);
      if (!sigVer) {
        throw TrustError.fromCode(new CertificateVerificationErrorCode('Invalid signature'));
      }
    } catch (err) {
      throw TrustError.fromCode(
        new CertificateVerificationErrorCode('Signature verification failed', err),
      );
    }
  }

  private async _checkDelegationAndGetKey(
    d: Delegation | undefined,
    timeDiffMsecs: number,
  ): Promise<Uint8Array> {
    if (!d) {
      return this._rootKey;
    }

    const cert = Certificate.createUnverified({
      certificate: d.certificate,
      rootKey: this._rootKey,
      canisterId: this._canisterId,
      blsVerify: this._blsVerify,
      disableTimeVerification: true,
    });

    if (cert.cert.delegation) {
      throw ProtocolError.fromCode(new CertificateHasTooManyDelegationsErrorCode());
    }

    await cert.verify(timeDiffMsecs);

    if (this._canisterId.toString() !== MANAGEMENT_CANISTER_ID) {
      const canisterInRange = check_canister_ranges({
        canisterId: this._canisterId,
        subnetId: Principal.fromUint8Array(new Uint8Array(d.subnet_id)),
        tree: cert.cert.tree,
      });
      if (!canisterInRange) {
        throw TrustError.fromCode(
          new CertificateNotAuthorizedErrorCode(this._canisterId, d.subnet_id),
        );
      }
    }
    const publicKeyLookup = lookupResultToBuffer(
      cert.lookup_path(['subnet', d.subnet_id, 'public_key']),
    );
    if (!publicKeyLookup) {
      throw TrustError.fromCode(
        new MissingLookupValueErrorCode(
          `Could not find subnet key for subnet 0x${bytesToHex(d.subnet_id)}`,
        ),
      );
    }
    return publicKeyLookup;
  }
}

const DER_PREFIX = hexToBytes(
  '308182301d060d2b0601040182dc7c0503010201060c2b0601040182dc7c05030201036100',
);
const KEY_LENGTH = 96;

function extractDER(buf: Uint8Array): Uint8Array {
  const expectedLength = DER_PREFIX.byteLength + KEY_LENGTH;
  if (buf.byteLength !== expectedLength) {
    throw ProtocolError.fromCode(new DerKeyLengthMismatchErrorCode(expectedLength, buf.byteLength));
  }
  const prefix = buf.slice(0, DER_PREFIX.byteLength);
  if (!uint8Equals(prefix, DER_PREFIX)) {
    throw ProtocolError.fromCode(new DerPrefixMismatchErrorCode(DER_PREFIX, prefix));
  }

  return buf.slice(DER_PREFIX.byteLength);
}

/**
 * Utility function to constrain the type of a lookup result
 * @param result the result of a lookup
 * @returns {Uint8Array | undefined} the value if the lookup was found, `undefined` otherwise
 */
export function lookupResultToBuffer(result: LookupResult): Uint8Array | undefined {
  if (result.status !== LookupPathStatus.Found) {
    return undefined;
  }

  if (result.value instanceof Uint8Array) {
    return result.value;
  }

  return undefined;
}

/**
 * @param t The hash tree to reconstruct
 */
export async function reconstruct(t: HashTree): Promise<Uint8Array> {
  switch (t[0]) {
    case NodeType.Empty:
      return sha256(domain_sep('ic-hashtree-empty'));
    case NodeType.Pruned:
      return t[1];
    case NodeType.Leaf:
      return sha256(concatBytes(domain_sep('ic-hashtree-leaf'), t[1]));
    case NodeType.Labeled:
      return sha256(concatBytes(domain_sep('ic-hashtree-labeled'), t[1], await reconstruct(t[2])));
    case NodeType.Fork:
      return sha256(
        concatBytes(
          domain_sep('ic-hashtree-fork'),
          await reconstruct(t[1]),
          await reconstruct(t[2]),
        ),
      );
    default:
      throw UNREACHABLE_ERROR;
  }
}

/**
 * Creates a domain separator for hashing by encoding the input string
 * with its length as a prefix.
 * @param s - The input string to encode.
 * @returns A Uint8Array containing the encoded domain separator.
 */
export function domain_sep(s: string): Uint8Array {
  const len = new Uint8Array([s.length]);
  const str = new TextEncoder().encode(s);
  return concatBytes(len, str);
}

function pathToLabel(path: NodePath): NodeLabel {
  return (typeof path[0] === 'string' ? utf8ToBytes(path[0]) : path[0]) as NodeLabel;
}

export enum LookupPathStatus {
  Unknown = 'Unknown',
  Absent = 'Absent',
  Found = 'Found',
  Error = 'Error',
}

export interface LookupPathResultAbsent {
  status: LookupPathStatus.Absent;
}

export interface LookupPathResultUnknown {
  status: LookupPathStatus.Unknown;
}

export interface LookupPathResultFound {
  status: LookupPathStatus.Found;
  value: Uint8Array;
}

export interface LookupPathResultError {
  status: LookupPathStatus.Error;
}

export type LookupResult =
  | LookupPathResultAbsent
  | LookupPathResultUnknown
  | LookupPathResultFound
  | LookupPathResultError;

export enum LookupSubtreeStatus {
  Absent = 'Absent',
  Unknown = 'Unknown',
  Found = 'Found',
}

export interface LookupSubtreeResultAbsent {
  status: LookupSubtreeStatus.Absent;
}

export interface LookupSubtreeResultUnknown {
  status: LookupSubtreeStatus.Unknown;
}

export interface LookupSubtreeResultFound {
  status: LookupSubtreeStatus.Found;
  value: HashTree;
}

export type SubtreeLookupResult =
  | LookupSubtreeResultAbsent
  | LookupSubtreeResultUnknown
  | LookupSubtreeResultFound;

export enum LookupLabelStatus {
  Absent = 'Absent',
  Unknown = 'Unknown',
  Found = 'Found',
  Less = 'Less',
  Greater = 'Greater',
}

export interface LookupLabelResultAbsent {
  status: LookupLabelStatus.Absent;
}

export interface LookupLabelResultUnknown {
  status: LookupLabelStatus.Unknown;
}

export interface LookupLabelResultFound {
  status: LookupLabelStatus.Found;
  value: HashTree;
}

export interface LookupLabelResultGreater {
  status: LookupLabelStatus.Greater;
}

export interface LookupLabelResultLess {
  status: LookupLabelStatus.Less;
}

export type LabelLookupResult =
  | LookupLabelResultAbsent
  | LookupLabelResultUnknown
  | LookupLabelResultFound
  | LookupLabelResultGreater
  | LookupLabelResultLess;

/**
 * Lookup a path in a tree. If the path is a subtree, use {@link lookup_subtree} instead.
 * @param path the path to look up
 * @param tree the tree to search
 * @returns {LookupResult} the result of the lookup
 */
export function lookup_path(path: NodePath, tree: HashTree): LookupResult {
  if (path.length === 0) {
    switch (tree[0]) {
      case NodeType.Empty: {
        return {
          status: LookupPathStatus.Absent,
        };
      }

      case NodeType.Leaf: {
        if (!tree[1]) {
          throw UnknownError.fromCode(
            new HashTreeDecodeErrorCode('Invalid tree structure for leaf'),
          );
        }

        if (tree[1] instanceof Uint8Array) {
          return {
            status: LookupPathStatus.Found,
            value: tree[1].slice(tree[1].byteOffset, tree[1].byteLength + tree[1].byteOffset),
          };
        }

        throw UNREACHABLE_ERROR;
      }

      case NodeType.Pruned: {
        return {
          status: LookupPathStatus.Unknown,
        };
      }

      case NodeType.Labeled:
      case NodeType.Fork: {
        return {
          status: LookupPathStatus.Error,
        };
      }

      default: {
        throw UNREACHABLE_ERROR;
      }
    }
  }

  const label = pathToLabel(path);
  const lookupResult = find_label(label, tree);

  switch (lookupResult.status) {
    case LookupLabelStatus.Found: {
      return lookup_path(path.slice(1), lookupResult.value);
    }

    case LookupLabelStatus.Absent:
    case LookupLabelStatus.Greater:
    case LookupLabelStatus.Less: {
      return {
        status: LookupPathStatus.Absent,
      };
    }

    case LookupLabelStatus.Unknown: {
      return {
        status: LookupPathStatus.Unknown,
      };
    }

    default: {
      throw UNREACHABLE_ERROR;
    }
  }
}

/**
 * Lookup a subtree in a tree.
 * @param path the path to look up
 * @param tree the tree to search
 * @returns {SubtreeLookupResult} the result of the lookup
 */
export function lookup_subtree(path: NodePath, tree: HashTree): SubtreeLookupResult {
  if (path.length === 0) {
    return {
      status: LookupSubtreeStatus.Found,
      value: tree,
    };
  }

  const label = pathToLabel(path);
  const lookupResult = find_label(label, tree);

  switch (lookupResult.status) {
    case LookupLabelStatus.Found: {
      return lookup_subtree(path.slice(1), lookupResult.value);
    }

    case LookupLabelStatus.Unknown: {
      return {
        status: LookupSubtreeStatus.Unknown,
      };
    }

    case LookupLabelStatus.Absent:
    case LookupLabelStatus.Greater:
    case LookupLabelStatus.Less: {
      return {
        status: LookupSubtreeStatus.Absent,
      };
    }

    default: {
      throw UNREACHABLE_ERROR;
    }
  }
}

/**
 * If the tree is a fork, flatten it into an array of trees
 * @param {HashTree} t the tree to flatten
 * @returns {HashTree[]} the flattened tree
 */
export function flatten_forks(t: HashTree): Array<LabeledHashTree | LeafHashTree | PrunedHashTree> {
  switch (t[0]) {
    case NodeType.Empty:
      return [];
    case NodeType.Fork:
      return flatten_forks(t[1]).concat(flatten_forks(t[2]));
    default:
      return [t];
  }
}

/**
 * Find a label in a tree
 * @param label the label to find
 * @param tree the tree to search
 * @returns {LabelLookupResult} the result of the label lookup
 */
export function find_label(label: NodeLabel, tree: HashTree): LabelLookupResult {
  switch (tree[0]) {
    // if we have a labelled node, compare the node's label to the one we are
    // looking for
    case NodeType.Labeled:
      // if the label we're searching for is greater than this node's label,
      // we need to keep searching
      if (isBufferGreaterThan(label, tree[1])) {
        return {
          status: LookupLabelStatus.Greater,
        };
      }

      // if the label we're searching for is equal this node's label, we can
      // stop searching and return the found node
      if (uint8Equals(label, tree[1])) {
        return {
          status: LookupLabelStatus.Found,
          value: tree[2],
        };
      }

      // if the label we're searching for is not greater than or equal to this
      // node's label, then it's less than this node's label, and we can stop
      // searching because we've looked too far
      return {
        status: LookupLabelStatus.Less,
      };

    // if we have a fork node, we need to search both sides, starting with the left
    case NodeType.Fork: {
      // search in the left node
      const leftLookupResult = find_label(label, tree[1]);

      switch (leftLookupResult.status) {
        // if the label we're searching for is greater than the left node lookup,
        // we need to search the right node
        case LookupLabelStatus.Greater: {
          const rightLookupResult = find_label(label, tree[2]);

          // if the label we're searching for is less than the right node lookup,
          // then we can stop searching and say that the label is provably Absent
          if (rightLookupResult.status === LookupLabelStatus.Less) {
            return {
              status: LookupLabelStatus.Absent,
            };
          }

          // if the label we're searching for is less than or equal to the right
          // node lookup, then we let the caller handle it
          return rightLookupResult;
        }

        // if the left node returns an uncertain result, we need to search the
        // right node
        case LookupLabelStatus.Unknown: {
          const rightLookupResult = find_label(label, tree[2]);

          // if the label we're searching for is less than the right node lookup,
          // then we also need to return an uncertain result
          if (rightLookupResult.status === LookupLabelStatus.Less) {
            return {
              status: LookupLabelStatus.Unknown,
            };
          }

          // if the label we're searching for is less than or equal to the right
          // node lookup, then we let the caller handle it
          return rightLookupResult;
        }

        // if the label we're searching for is not greater than the left node
        // lookup, or the result is not uncertain, we stop searching and return
        // whatever the result of the left node lookup was, which can be either
        // Found or Absent
        default: {
          return leftLookupResult;
        }
      }
    }

    // if we encounter a Pruned node, we can't know for certain if the label
    // we're searching for is present or not
    case NodeType.Pruned:
      return {
        status: LookupLabelStatus.Unknown,
      };

    // if the current node is Empty, or a Leaf, we can stop searching because
    // we know for sure that the label we're searching for is not present
    default:
      return {
        status: LookupLabelStatus.Absent,
      };
  }
}

/**
 * Check if a canister ID falls within the canister ranges of a given subnet
 * @param params the parameters with which to check the canister ranges
 * @param params.canisterId the canister ID to check
 * @param params.subnetId the subnet ID from which to check the canister ranges
 * @param params.tree the hash tree in which to lookup the subnet's canister ranges
 * @returns {boolean} `true` if the canister is in the range, `false` otherwise
 */
export function check_canister_ranges(params: {
  canisterId: Principal;
  subnetId: Principal;
  tree: HashTree;
}): boolean {
  const { canisterId, subnetId, tree } = params;
  const rangeLookup = lookup_path(['subnet', subnetId.toUint8Array(), 'canister_ranges'], tree);

  if (rangeLookup.status !== LookupPathStatus.Found) {
    throw ProtocolError.fromCode(
      new LookupErrorCode(
        `Could not find canister ranges for subnet ${subnetId.toText()}`,
        rangeLookup.status,
      ),
    );
  }

  if (!(rangeLookup.value instanceof Uint8Array)) {
    throw ProtocolError.fromCode(
      new MalformedLookupFoundValueErrorCode(
        `Could not find canister ranges for subnet ${subnetId.toText()}`,
      ),
    );
  }

  const ranges_arr = cbor.decode<Array<[Uint8Array, Uint8Array]>>(rangeLookup.value);
  const ranges: Array<[Principal, Principal]> = ranges_arr.map(v => [
    Principal.fromUint8Array(v[0]),
    Principal.fromUint8Array(v[1]),
  ]);

  const canisterInRange = ranges.some(r => r[0].ltEq(canisterId) && r[1].gtEq(canisterId));

  return canisterInRange;
}
