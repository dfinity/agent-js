import * as cbor from './cbor';
import { ReadStateResponse } from './http_agent_types';
import { BinaryBlob } from './types';

interface Cert extends Record<string, any> {
  tree: HashTree;
  signature: BinaryBlob;
  delegations?: Delegation; 
}

type HashTree =
  | HashTreeEmpty
  | HashTreeFork
  | HashTreeLabeled
  | HashTreeLeaf
  | HashTreePruned;
interface HashTreeEmpty {
  status: 'empty';
}
interface HashTreeFork {
  status: 'fork';
  left: HashTree;
  right: HashTree;
}
interface HashTreeLabeled {
  status: 'labeled';
  label: BinaryBlob;
  tree: HashTree;
}
interface HashTreeLeaf {
  status: 'leaf';
  leaf: BinaryBlob;
}
interface HashTreePruned {
  status: 'pruned';
  hash: BinaryBlob;
}

interface Delegation extends Record<string, any> {
  subnet_id: BinaryBlob;
  certificate: BinaryBlob;
}

export class Certificate {
  private readonly cert: Cert;
  constructor(response: ReadStateResponse) {
    this.cert = cbor.decode(response.certificate);
  }
}
