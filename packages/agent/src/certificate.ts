import { Agent, getDefaultAgent, ReadStateResponse } from './agent';
import * as cbor from './cbor';
import { AgentError } from './errors';
import { hash } from './request_id';
import { blsVerify } from './utils/bls';
import { concat, fromHex, toHex } from './utils/buffer';

/**
 * A certificate needs to be verified (using {@link Certificate.prototype.verify})
 * before it can be used.
 */
export class UnverifiedCertificateError extends AgentError {
  constructor() {
    super(`Cannot lookup unverified certificate. Call 'verify()' first.`);
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

export class Certificate {
  private readonly cert: Cert;
  private verified = false;
  private _rootKey: ArrayBuffer | null = null;

  constructor(response: ReadStateResponse, private _agent: Agent = getDefaultAgent()) {
    this.cert = cbor.decode(new Uint8Array(response.certificate));
  }

  public lookup(path: Array<ArrayBuffer | string>): ArrayBuffer | undefined {
    this.checkState();
    return lookup_path(path, this.cert.tree);
  }

  public async verify(): Promise<boolean> {
    const rootHash = await reconstruct(this.cert.tree);
    const derKey = await this._checkDelegation(this.cert.delegation);
    const sig = this.cert.signature;
    const key = extractDER(derKey);
    const msg = concat(domain_sep('ic-state-root'), rootHash);
    const res = await blsVerify(new Uint8Array(key), new Uint8Array(sig), new Uint8Array(msg));
    this.verified = res;
    return res;
  }

  protected checkState(): void {
    if (!this.verified) {
      throw new UnverifiedCertificateError();
    }
  }

  private async _checkDelegation(d?: Delegation): Promise<ArrayBuffer> {
    if (!d) {
      if (!this._rootKey) {
        if (this._agent.rootKey) {
          this._rootKey = this._agent.rootKey;
          return this._rootKey;
        }

        throw new Error(`Agent does not have a rootKey. Do you need to call 'fetchRootKey'?`);
      }
      return this._rootKey;
    }
    const cert: Certificate = new Certificate(d as any, this._agent);
    if (!(await cert.verify())) {
      throw new Error('fail to verify delegation certificate');
    }

    const lookup = cert.lookup(['subnet', d.subnet_id, 'public_key']);
    if (!lookup) {
      throw new Error(`Could not find subnet key for subnet 0x${toHex(d.subnet_id)}`);
    }
    return lookup;
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
