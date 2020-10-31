import { Buffer } from 'buffer/';
import { getRootKey } from './actor';
import * as cbor from './cbor';
import { ReadStateResponse } from './http_agent_types';
import { hash } from './request_id';
import { BinaryBlob } from './types';

interface Cert extends Record<string, any> {
  tree: HashTree;
  signature: Buffer;
  delegation?: Delegation;
}

const enum NodeId {
  Empty = 0,
  Fork = 1,
  Labeled = 2,
  Leaf = 3,
  Pruned = 4,
}
type HashTree = [0] | [1, HashTree, HashTree] | [2, Buffer, HashTree] | [3, Buffer] | [4, Buffer];

interface Delegation extends Record<string, any> {
  subnet_id: Buffer;
  certificate: Buffer;
}

export class Certificate {
  private readonly cert: Cert;
  constructor(response: ReadStateResponse) {
    this.cert = cbor.decode(response.certificate);
  }
  public lookup(path: Buffer[]): Buffer | undefined {
    return lookup_path(path, this.cert.tree);
  }
  public getTree(): HashTree {
    return this.cert.tree;
  }
}

export async function verify(t: HashTree) {
  const rootHash = await reconstruct(t);
  const key = await getRootKey();
  return rootHash;
}

async function reconstruct(t: HashTree): Promise<Buffer> {
  switch (t[0]) {
    case NodeId.Empty:
      return hash(domain_sep('ic-hashtree-empty') as BinaryBlob);
    case NodeId.Pruned:
      return t[1] as Buffer;
    case NodeId.Leaf:
      return hash(
        Buffer.concat([domain_sep('ic-hashtree-leaf'), Buffer.from(t[1] as Buffer)]) as BinaryBlob,
      );
    case NodeId.Labeled:
      return hash(
        Buffer.concat([
          domain_sep('ic-hashtree-labeled'),
          Buffer.from(t[1] as Buffer),
          Buffer.from(await reconstruct(t[2] as HashTree)),
        ]) as BinaryBlob,
      );
    case NodeId.Fork:
      return hash(
        Buffer.concat([
          domain_sep('ic-hashtree-fork'),
          Buffer.from(await reconstruct(t[1] as HashTree)),
          Buffer.from(await reconstruct(t[2] as HashTree)),
        ]) as BinaryBlob,
      );
    default:
      throw new Error('unreachable');
  }
}

function domain_sep(s: string): Buffer {
  const buf = Buffer.alloc(1);
  buf.writeUInt8(s.length, 0);
  return Buffer.concat([buf, Buffer.from(s)]);
}

function lookup_path(path: Buffer[], tree: HashTree): Buffer | undefined {
  if (path.length === 0) {
    switch (tree[0]) {
      case NodeId.Leaf: {
        return tree[1] as Buffer;
      }
      default: {
        return undefined;
      }
    }
  }
  const t = find_label(path[0], flatten_forks(tree));
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
function find_label(l: Buffer, trees: HashTree[]): HashTree | undefined {
  if (trees.length === 0) {
    return undefined;
  }
  for (const t of trees) {
    if (t[0] === NodeId.Labeled) {
      const p = Buffer.from(t[1] as Buffer); // why?
      if (l.equals(p)) {
        return t[2];
      }
    }
  }
}
