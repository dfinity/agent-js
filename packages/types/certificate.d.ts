import { VerifyFunc } from 'actor';
import { AbstractPrincipal } from 'principal';

/**
 * A signature array buffer.
 */
export declare type Signature = ArrayBuffer & {
  __signature__: void;
};

export interface Cert {
  tree: HashTree;
  signature: ArrayBuffer;
  delegation?: Delegation;
}

export const enum NodeId {
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

interface Delegation extends Record<string, any> {
  subnet_id: ArrayBuffer;
  certificate: ArrayBuffer;
}

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
  canisterId: AbstractPrincipal;
  /**
   * BLS Verification strategy. Default strategy uses wasm for performance, but that may not be available in all contexts.
   */
  blsVerify?: VerifyFunc;
}

export abstract class AbstractCertificate {
  static create(options: CreateCertificateOptions): Promise<AbstractCertificate>;
  abstract lookup(path: Array<ArrayBuffer | string>): ArrayBuffer | undefined;
  abstract verify(): Promise<void>;
}
