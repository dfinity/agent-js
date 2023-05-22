import { Principal } from '@dfinity/principal';
import { HttpAgentRequest } from './agent/http/types';
import { requestIdOf } from './request_id';
import { concat, toHex } from './utils/buffer';

const domainSeparator = new TextEncoder().encode('\x0Aic-request');

/**
 * A Key Pair, containing a secret and public key.
 */
export interface KeyPair {
  secretKey: ArrayBuffer;
  publicKey: PublicKey;
}

/**
 * A public key that is DER encoded. This is a branded ArrayBuffer.
 */
export type DerEncodedPublicKey = ArrayBuffer & { __derEncodedPublicKey__?: void };

/**
 * A signature array buffer.
 */
export type Signature = ArrayBuffer & { __signature__: void };

/**
 * A Public Key implementation.
 */
export interface PublicKey {
  // Get the public key bytes encoded with DER.
  toDer(): DerEncodedPublicKey;
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
  transformRequest(request: HttpAgentRequest): Promise<unknown>;
}

/**
 * An Identity that can sign blobs.
 */
export abstract class SignIdentity implements Identity {
  protected _principal: Principal | undefined;

  /**
   * Returns the public key that would match this identity's signature.
   */
  public abstract getPublicKey(): PublicKey;

  /**
   * Signs a blob of data, with this identity's private key.
   */
  public abstract sign(blob: ArrayBuffer): Promise<Signature>;

  /**
   * Get the principal represented by this identity. Normally should be a
   * `Principal.selfAuthenticating()`.
   */
  public getPrincipal(): Principal {
    if (!this._principal) {
      this._principal = Principal.selfAuthenticating(new Uint8Array(this.getPublicKey().toDer()));
    }
    return this._principal;
  }

  /**
   * Transform a request into a signed version of the request. This is done last
   * after the transforms on the body of a request. The returned object can be
   * anything, but must be serializable to CBOR.
   * @param request - internet computer request to transform
   */
  public async transformRequest(request: HttpAgentRequest): Promise<unknown> {
    const { body, ...fields } = request;
    const requestId = await requestIdOf(body);
    return {
      ...fields,
      body: {
        content: body,
        sender_pubkey: this.getPublicKey().toDer(),
        sender_sig: await this.sign(concat(domainSeparator, requestId)),
      },
    };
  }
}

export class AnonymousIdentity implements Identity {
  public getPrincipal(): Principal {
    return Principal.anonymous();
  }

  public async transformRequest(request: HttpAgentRequest): Promise<unknown> {
    return {
      ...request,
      body: { content: request.body },
    };
  }
}

/*
 * We need to communicate with other agents on the page about identities,
 * but those messages may need to go across boundaries where it's not possible to
 * serialize/deserialize object prototypes easily.
 * So these are lightweight, serializable objects that contain enough information to recreate
 * SignIdentities, but don't commit to having all methods of SignIdentity.
 *
 * Use Case:
 * * DOM Events that let differently-versioned components communicate to one another about
 *   Identities, even if they're using slightly different versions of agent packages to
 *   create/interpret them.
 */
export interface AnonymousIdentityDescriptor {
  type: 'AnonymousIdentity';
}
export interface PublicKeyIdentityDescriptor {
  type: 'PublicKeyIdentity';
  publicKey: string;
}
export type IdentityDescriptor = AnonymousIdentityDescriptor | PublicKeyIdentityDescriptor;

/**
 * Create an IdentityDescriptor from a @dfinity/identity Identity
 * @param identity - identity describe in returned descriptor
 */
export function createIdentityDescriptor(
  identity: SignIdentity | AnonymousIdentity,
): IdentityDescriptor {
  const identityIndicator: IdentityDescriptor =
    'getPublicKey' in identity
      ? { type: 'PublicKeyIdentity', publicKey: toHex(identity.getPublicKey().toDer()) }
      : { type: 'AnonymousIdentity' };
  return identityIndicator;
}
