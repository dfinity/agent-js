import {
  BinaryBlob,
  blobFromHex,
  blobFromUint8Array,
  derBlobFromBlob,
  DerEncodedBlob,
  HttpAgentRequest,
  Principal,
  PublicKey,
  requestIdOf,
  SignIdentity,
} from '@dfinity/agent';
import BigNumber from 'bignumber.js';
import { Buffer } from 'buffer/';
import * as cbor from 'simple-cbor';

const domainSeparator = new TextEncoder().encode('\x1Aic-request-auth-delegation');
const requestDomainSeparator = Buffer.from(new TextEncoder().encode('\x0Aic-request'));

function _parseBlob(value: unknown): BinaryBlob {
  if (typeof value !== 'string' || value.length < 64) {
    throw new Error('Invalid public key.');
  }

  return blobFromHex(value);
}

/**
 * A single delegation object that is signed by a private key. This is constructed by
 * `DelegationChain.create()`.
 *
 * {@see DelegationChain}
 */
export class Delegation {
  constructor(
    public readonly pubkey: BinaryBlob,
    public readonly expiration: BigNumber,
    public readonly targets?: Principal[],
  ) {}

  public toCBOR(): cbor.CborValue {
    // Expiration field needs to be encoded as a u64 specifically.
    return cbor.value.map({
      pubkey: cbor.value.bytes(this.pubkey),
      expiration: cbor.value.u64(this.expiration.toString(16), 16),
      ...(this.targets && { targets: this.targets.map(t => cbor.value.bytes(t.toBlob())) }),
    } as any);
  }

  public toJson(): any {
    return {
      expiration: this.expiration.toString(16),
      pubkey: this.pubkey.toString('hex'),
      ...(this.targets && this.targets.map(p => p.toText())),
    };
  }
}

/**
 * A signed delegation, which lends its identity to the public key in the delegation
 * object. This is constructed by `DelegationChain.create()`.
 *
 * {@see DelegationChain}
 */
export interface SignedDelegation {
  delegation: Delegation;
  signature: BinaryBlob;
}

/**
 * Sign a single delegation object for a period of time.
 * @param from The identity that lends its delegation.
 * @param to The identity that receives the delegation.
 * @param expiration An expiration date for this delegation.
 * @param targets Limit this delegation to the target principals.
 */
async function _createSingleDelegation(
  from: SignIdentity,
  to: PublicKey,
  expiration: Date,
  targets?: Principal[],
): Promise<SignedDelegation> {
  const delegation: Delegation = new Delegation(
    to.toDer(),
    new BigNumber(+expiration).times(1000000), // In nanoseconds.
    targets,
  );

  // The signature is calculated by signing the concatenation of the domain separator
  // and the message.
  const signature = await from.sign(
    blobFromUint8Array(new Uint8Array([...domainSeparator, ...(await requestIdOf(delegation))])),
  );

  return {
    delegation,
    signature,
  };
}

/**
 * A chain of delegations. This is JSON Serializable.
 * This is the object to serialize and pass to a DelegationIdentity. It does not keep any
 * private keys.
 */
export class DelegationChain {
  /**
   * Create a delegation chain between two (or more) keys. By default, the expiration time
   * will be very short (15 minutes).
   *
   * To build a chain of more than 2 identities, this function needs to be called multiple times,
   * passing the previous delegation chain into the options argument. For example:
   *
   * @example
   * const rootKey = createKey();
   * const middleKey = createKey();
   * const bottomeKey = createKey();
   *
   * const rootToMiddle = await DelegationChain.create(
   *   root, middle.getPublicKey(), Date.parse('2100-01-01'),
   * );
   * const middleToBottom = await DelegationChain.create(
   *   middle, bottom.getPublicKey(), Date.parse('2100-01-01'), { previous: rootToMiddle },
   * );
   *
   * // We can now use a delegation identity that uses the delegation above:
   * const identity = DelegationIdentity.fromDelegation(bottomKey, middleToBottom);
   *
   * @param from The identity that will delegate.
   * @param to The identity that gets delegated. It can now sign messages as if it was the
   *           identity above.
   * @param expiration The length the delegation is valid. By default, 15 minutes from calling
   *                   this function.
   * @param options A set of options for this delegation. expiration and previous
   */
  public static async create(
    from: SignIdentity,
    to: PublicKey,
    expiration: Date = new Date(Date.now() + 15 * 60 * 1000),
    options: { previous?: DelegationChain } = {},
  ): Promise<DelegationChain> {
    const delegation = await _createSingleDelegation(from, to, expiration);

    return new DelegationChain(
      [...(options.previous?.delegations || []), delegation],
      options.previous?.publicKey || from.getPublicKey().toDer(),
    );
  }

  /**
   * Creates a DelegationChain object from a JSON string.
   * @param json The JSON string to parse.
   */
  public static fromJSON(json: string): DelegationChain {
    const { publicKey, delegations } = JSON.parse(json);

    if (!Array.isArray(delegations)) {
      throw new Error('Invalid delegations.');
    }

    const parsedDelegations: SignedDelegation[] = delegations.map(signedDelegation => {
      const { delegation, signature } = signedDelegation;
      const { pubkey, expiration, targets } = delegation;
      if (targets !== undefined && !Array.isArray(targets)) {
        throw new Error('Invalid targets.');
      }
      return {
        delegation: new Delegation(
          _parseBlob(pubkey),
          new BigNumber(expiration, 16),
          targets &&
            targets.map((t: unknown) => {
              if (typeof t !== 'string') {
                throw new Error('Invalid target.');
              }
              return Principal.fromText(t);
            }),
        ),
        signature: _parseBlob(signature),
      };
    });

    return new this(parsedDelegations, derBlobFromBlob(_parseBlob(publicKey)));
  }

  protected constructor(
    public readonly delegations: SignedDelegation[],
    public readonly publicKey: DerEncodedBlob,
  ) {}

  public toJSON(): any {
    return {
      delegations: this.delegations.map(signedDelegation => {
        const { delegation, signature } = signedDelegation;
        return { delegation, signature: signature.toString('hex') };
      }),
      publicKey: this.publicKey.toString('hex'),
    };
  }
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
  public static fromDelegation(key: SignIdentity, delegation: DelegationChain): DelegationIdentity {
    return new this(key, delegation);
  }

  protected constructor(private _inner: SignIdentity, private _delegation: DelegationChain) {
    super();
  }

  public getDelegation(): DelegationChain {
    return this._delegation;
  }

  public getPublicKey(): PublicKey {
    return {
      toDer: () => this._delegation.publicKey,
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
        sender_delegation: this._delegation.delegations,
        sender_pubkey: this._delegation.publicKey,
      },
    };
  }
}
