import { Buffer } from 'buffer/';
import {
  AuthHttpAgentRequestTransformFn,
  HttpAgentRequest,
  SignedHttpAgentRequest,
} from './http_agent_types';
import { Principal } from './principal';
import { RequestId, requestIdOf } from './request_id';
import { BinaryBlob, blobFromUint8Array, DerEncodedBlob } from './types';

/**
 * A Key Pair, containing a secret and public key.
 */
export interface KeyPair {
  secretKey: BinaryBlob;
  publicKey: PublicKey;
}

/**
 * A Public Key implementation.
 */
export interface PublicKey {
  // Get the public key bytes in its raw unencoded form.
  toRaw(): BinaryBlob;

  // Get the public key bytes encoded with DER.
  toDer(): DerEncodedBlob;
}

/**
 * A General Identity object. This does not have to be a private key (for example,
 * the Anonymous identity), but it must be able to transform request.
 */
export interface Identity {
  /**
   * Get the principal represented by this identity. Normally should be a
   * `Principal.selfAuthenticating()`.
   */
  getPrincipal(): Principal;

  /**
   * Transform a request into a signed version of the request. This is done last
   * after the transforms on the body of a request. The returned object can be
   * anything, but must be serializable to CBOR.
   */
  transformRequest(request: HttpAgentRequest): Promise<any>;
}

export class AnonymousIdentity implements Identity {
  public getPrincipal(): Principal {
    return Principal.anonymous();
  }

  public async transformRequest(request: HttpAgentRequest): Promise<any> {
    return {
      ...request,
      body: { content: request.body },
    };
  }
}
