import {
  BinaryBlob,
  blobFromUint8Array,
  derBlobFromBlob,
  HttpAgentRequest,
  Principal,
  PublicKey,
  requestIdOf,
  SignIdentity,
} from '@dfinity/agent';
import BigNumber from 'bignumber.js';

const domainSeparator = new TextEncoder().encode('\x1Aic-request-auth-delegation');
const requestDomainSeparator = new TextEncoder().encode('\x0Aic-request');

export async function signDelegation(
  innerDelegation: Delegation,
  identity: SignIdentity,
): Promise<BinaryBlob> {
  // The signature is calculated by signing the concatenation of the domain separator
  // and the message.
  return await identity.sign(
    blobFromUint8Array(
      new Uint8Array([...domainSeparator, ...(await requestIdOf(innerDelegation))]),
    ),
  );
}

// rootKey - which lends its public key to another key
// sender_delegation:
//
//  2 keys:
//  [
//    senderDelegationA: {
//      delegationA: {
//        pubkey: middleKey.pubkey
//        expiration: 123456
//      }
//      signature: rootKey.sign(delegationA)
//    }
// ], pubkey: rootKey.pubkey
//
//
//  3 keys:
//  [
//    senderDelegationA: {
//      delegationA: {
//        pubkey: middleKey.pubkey
//        expiration: 123456
//      }
//      signature: rootKey.sign(delegationA)
//    },
//    senderDelegationB: {
//      delegationB: {
//        pubkey: bottomKey.pubkey
//        expiration: 123456
//      },
//      signature: middleKey.sign(DelegationB)
//    }
// ],
// pubkey: rootKey.pubkey
// signature: bottomKey.sign(envelope)

interface Delegation {
  pubkey: BinaryBlob;
  expiration: BigNumber;
  targets?: Principal[];
}

interface SignedDelegation {
  delegation: Delegation;
  signature: BinaryBlob;
}

interface SenderDelegation {
  sender_delegation: SignedDelegation[];
  sender_pubkey: BinaryBlob;
}

/**
 * Sign a delegation object for a period of time.
 * @param to The identity to lend the delegation to.
 * @param expiration An expiration date for this delegation.
 * @param targets Limit this delegation to the target principals.
 */
async function _createDelegation(
  from: SignIdentity,
  to: SignIdentity,
  expiration: Date,
  targets?: Principal[],
): Promise<SignedDelegation> {
  const delegation: Delegation = {
    pubkey: to.getPublicKey().toDer(),
    expiration: new BigNumber(+expiration).times(1000000), // In nanoseconds.
    ...(targets && { targets }),
  };
  const signature = await signDelegation(delegation, from);

  return {
    delegation,
    signature,
  };
}

/**
 * Create a signed delegation between two keys, or a key and another delegation object.
 */
export async function createDelegation(
  from: SignIdentity,
  to: SignIdentity,
  options: {
    expiration?: Date;
    previous?: SenderDelegation;
  } = {},
): Promise<SenderDelegation> {
  const expiration = options.expiration || new Date(1609459200000 /**/);
  const delegation = await _createDelegation(from, to, expiration);

  return {
    sender_delegation: [...(options.previous?.sender_delegation || []), delegation],
    sender_pubkey: options.previous?.sender_pubkey || from.getPublicKey().toDer(),
  };
}

/**
 * An Identity that adds delegation to a request. Everywhere in this class, the name
 * innerKey refers to the SignIdentity that is being used to sign the requests, while
 * originalKey is the identity that is being borrowed. More identities can be used
 * in the middle to delegate.
 */
export class DelegationIdentity extends SignIdentity {
  /**
   * Create a delegation without having access to delegateKey.
   * @param key The key used to sign the reqyests.
   * @param delegation A delegation object created using `createDelegation`.
   */
  public static fromDelegation(
    key: SignIdentity,
    delegation: SenderDelegation,
  ): DelegationIdentity {
    return new this(key, delegation);
  }

  protected constructor(private _inner: SignIdentity, private _delegation: SenderDelegation) {
    super();
  }

  public getDelegation(): SenderDelegation {
    return this._delegation;
  }

  public getPublicKey(): PublicKey {
    return {
      toDer: () => derBlobFromBlob(this._delegation.sender_pubkey),
    };
  }
  public sign(blob: BinaryBlob): Promise<BinaryBlob> {
    return this._inner.sign(blob);
  }

  public async transformRequest(request: HttpAgentRequest): Promise<any> {
    const { body, ...fields } = request;
    const requestId = await requestIdOf(body);
    return {
      ...fields,
      body: {
        content: body,
        sender_sig: await this.sign(
          blobFromUint8Array(Buffer.concat([requestDomainSeparator, requestId])),
        ),
        ...this._delegation,
      },
    };
  }
}
