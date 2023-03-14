import { AbstractIdentity, IdentityDescriptor, PublicKey, Signature } from '@dfinity/types';
import { concat, toHex } from './utils/buffer';
import { Principal } from '@dfinity/principal';
import { requestIdOf } from './request_id';
import { HttpAgentRequest } from './agent/http/types';

const domainSeparator = new TextEncoder().encode('\x0Aic-request');

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

/**
 * An Identity that can sign blobs.
 */
export abstract class SignIdentity extends AbstractIdentity {
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

export class AnonymousIdentity extends AbstractIdentity {
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
