import { Buffer } from 'buffer/';
import * as cbor from './cbor';
import { ReadStateResponse } from './http_agent_types';

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
