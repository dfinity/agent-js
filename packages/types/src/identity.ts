import { Signature } from './certificate';
import { AbstractPrincipal } from './principal';

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
 * A Public Key implementation.
 */
export interface PublicKey {
  // Get the public key bytes encoded with DER.
  toDer(): DerEncodedPublicKey;
}

/**
 * A General Identity object. This does not have to be a private key (for example,
 * the Anonymous identity), but it must be able to transform request.
 * The request is left as any, and should be implemented by the agent
 */
export abstract class AbstractIdentity {
  protected _principal: AbstractPrincipal | undefined;
  /**
   * Get the principal represented by this identity. Normally should be a
   * `Principal.selfAuthenticating()`.
   */
  abstract getPrincipal(): AbstractPrincipal;

  /**
   * Transform a request into a signed version of the request. This is done last
   * after the transforms on the body of a request. The returned object can be
   * anything, but must be serializable to CBOR.
   */
  abstract transformRequest(request: any): Promise<unknown>;
}

/**
 * An Identity that can sign blobs. The request is left as any, and should be implemented by the agent
 */
export abstract class AbstractSignIdentity extends AbstractIdentity {
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
  public abstract getPrincipal(): AbstractPrincipal;

  /**
   * Transform a request into a signed version of the request. This is done last
   * after the transforms on the body of a request. The returned object can be
   * anything, but must be serializable to CBOR.
   * @param request - internet computer request to transform
   */
  public abstract transformRequest(request: any): Promise<unknown>;
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
