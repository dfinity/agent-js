import { Buffer } from 'buffer/';
import { getRootKey } from './actor';
import * as cbor from './cbor';
import { ReadStateResponse } from './http_agent_types';
import { hash } from './request_id';
import { BinaryBlob } from './types';
import { CTX } from 'amcl-js';

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
  public verify(): Promise<boolean> {
    return _verify(this.cert.tree, this.cert.signature, this.cert.delegation);
  }
}

async function _verify(t: HashTree, sig: Buffer, d?: Delegation): Promise<boolean> {
  const rootHash = await reconstruct(t);
  const key = await checkDelegation(d);
  const msg = Buffer.concat([domain_sep('ic-state-root'), rootHash]);
  
  const ctx = new CTX('BLS12381');
  const init = ctx.BLS.init();
  if (init !== 0) {
    throw new Error('failed to initialize BLS');
  }
  //console.log(rootHash.length, key.length, msg.length);
  const res = ctx.BLS.core_verify(bufferToArray(sig), bufferToArray(msg), bufferToArray(key));
  return res === 0 ? true : false;
}

async function checkDelegation(d? : Delegation): Promise<Buffer> {
  if (!d) {
    return await getRootKey();
  }
  const cert: Certificate = new Certificate(d as any);
  //console.log(await cert.verify());
  const res = cert.lookup([Buffer.from('subnet'), d.subnet_id, Buffer.from('public_key')])!;
  return Promise.resolve(res);
}

function bufferToArray(buf: Buffer): number[] {
  const typedArray = new Uint8Array(buf.buffer, buf.byteOffset, buf.length);
  return Array.from(typedArray);
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
