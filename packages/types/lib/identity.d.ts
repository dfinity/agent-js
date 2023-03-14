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
export declare type DerEncodedPublicKey = ArrayBuffer & {
  __derEncodedPublicKey__?: void;
};
/**
 * A Public Key implementation.
 */
export interface PublicKey {
  toDer(): DerEncodedPublicKey;
}
/**
 * A General Identity object. This does not have to be a private key (for example,
 * the Anonymous identity), but it must be able to transform request.
 * The request is left as any, and should be implemented by the agent
 */
export declare abstract class AbstractIdentity {
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
export declare abstract class AbstractSignIdentity extends AbstractIdentity {
  /**
   * Returns the public key that would match this identity's signature.
   */
  abstract getPublicKey(): PublicKey;
  /**
   * Signs a blob of data, with this identity's private key.
   */
  abstract sign(blob: ArrayBuffer): Promise<Signature>;
  /**
   * Get the principal represented by this identity. Normally should be a
   * `Principal.selfAuthenticating()`.
   */
  abstract getPrincipal(): AbstractPrincipal;
  /**
   * Transform a request into a signed version of the request. This is done last
   * after the transforms on the body of a request. The returned object can be
   * anything, but must be serializable to CBOR.
   * @param request - internet computer request to transform
   */
  abstract transformRequest(request: any): Promise<unknown>;
}
export interface AnonymousIdentityDescriptor {
  type: 'AnonymousIdentity';
}
export interface PublicKeyIdentityDescriptor {
  type: 'PublicKeyIdentity';
  publicKey: string;
}
export declare type IdentityDescriptor = AnonymousIdentityDescriptor | PublicKeyIdentityDescriptor;
