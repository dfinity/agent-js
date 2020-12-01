import { Buffer } from 'buffer/';
import { HttpAgentRequest } from './http_agent_types';
import { Principal } from './principal';
import { requestIdOf } from './request_id';
import { BinaryBlob, blobFromBuffer, blobFromUint8Array, DerEncodedBlob } from './types';

const domainSeparator = Buffer.from(new TextEncoder().encode('\x0Aic-request'));

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

/**
 * An Identity that can sign blobs.
 */
export abstract class SignIdentity implements Identity {
  /**
   * Returns the public key that would match this identity's signature.
   */
  public abstract getPublicKey(): PublicKey;

  /**
   * Signs a blob of data, with this identity's private key.
   */
  public abstract async sign(blob: BinaryBlob): Promise<BinaryBlob>;

  /**
   * Get the principal represented by this identity. Normally should be a
   * `Principal.selfAuthenticating()`.
   */
  public getPrincipal(): Principal {
    return Principal.selfAuthenticating(this.getPublicKey().toDer());
  }

  /**
   * Transform a request into a signed version of the request. This is done last
   * after the transforms on the body of a request. The returned object can be
   * anything, but must be serializable to CBOR.
   */
  public async transformRequest(request: HttpAgentRequest): Promise<any> {
    const { body, ...fields } = request;
    const requestId = await requestIdOf(body);
    return {
      ...fields,
      body: {
        content: body,
        sender_pubkey: this.getPublicKey().toDer(),
        sender_sig: await this.sign(blobFromBuffer(Buffer.concat([domainSeparator, requestId]))),
      },
    };
  }
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
