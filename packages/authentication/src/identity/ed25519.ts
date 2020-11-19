import {
  BinaryBlob,
  blobFromUint8Array,
  derBlobFromBlob,
  DerEncodedBlob,
  HttpAgentRequest,
  Identity,
  KeyPair,
  Principal,
  PublicKey,
  RequestId,
  requestIdOf,
} from '@dfinity/agent';
import * as tweetnacl from 'tweetnacl';

const domainSeparator = new TextEncoder().encode('\x0Aic-request');

function sign(requestId: RequestId, secretKey: BinaryBlob): BinaryBlob {
  const bufA = Buffer.concat([domainSeparator, requestId]);
  const signature = tweetnacl.sign.detached(bufA, secretKey);
  return blobFromUint8Array(signature);
}

export class Ed25519PublicKey implements PublicKey {
  public static from(key: PublicKey) {
    return this.fromDer(key.toDer());
  }

  public static fromRaw(rawKey: BinaryBlob): Ed25519PublicKey {
    return new Ed25519PublicKey(rawKey);
  }

  public static fromDer(derKey: BinaryBlob): Ed25519PublicKey {
    return new Ed25519PublicKey(this.derDecode(derKey));
  }

  // The length of Ed25519 public keys is always 32 bytes.
  private static RAW_KEY_LENGTH = 32;

  // Adding this prefix to a raw public key is sufficient to DER-encode it.
  // See https://github.com/dfinity/agent-js/issues/42#issuecomment-716356288
  private static DER_PREFIX = Uint8Array.from([
    ...[48, 42], // SEQUENCE
    ...[48, 5], // SEQUENCE
    ...[6, 3], // OBJECT
    ...[43, 101, 112], // Ed25519 OID
    ...[3], // OBJECT
    ...[Ed25519PublicKey.RAW_KEY_LENGTH + 1], // BIT STRING
    ...[0], // 'no padding'
  ]);

  private static derEncode(publicKey: BinaryBlob): DerEncodedBlob {
    if (publicKey.byteLength !== Ed25519PublicKey.RAW_KEY_LENGTH) {
      throw new TypeError(
        `ed25519 public key must be ${Ed25519PublicKey.RAW_KEY_LENGTH} bytes long`,
      );
    }

    // https://github.com/dfinity/agent-js/issues/42#issuecomment-716356288
    const derPublicKey = Uint8Array.from([
      ...Ed25519PublicKey.DER_PREFIX,
      ...new Uint8Array(publicKey),
    ]);

    return derBlobFromBlob(blobFromUint8Array(derPublicKey));
  }

  private static derDecode(key: BinaryBlob): BinaryBlob {
    const expectedLength = Ed25519PublicKey.DER_PREFIX.length + Ed25519PublicKey.RAW_KEY_LENGTH;
    if (key.byteLength !== expectedLength) {
      throw new TypeError(`Ed25519 DER-encoded public key must be ${expectedLength} bytes long`);
    }

    const rawKey = key.subarray(Ed25519PublicKey.DER_PREFIX.length) as BinaryBlob;
    if (!this.derEncode(rawKey).equals(key)) {
      throw new TypeError(
        'Ed25519 DER-encoded public key is invalid. A valid Ed25519 DER-encoded public key ' +
          `must have the following prefix: ${Ed25519PublicKey.DER_PREFIX}`,
      );
    }

    return rawKey;
  }

  private readonly rawKey: BinaryBlob;
  private readonly derKey: DerEncodedBlob;

  // `fromRaw` and `fromDer` should be used for instantiation, not this constructor.
  private constructor(key: BinaryBlob) {
    this.rawKey = key;
    this.derKey = Ed25519PublicKey.derEncode(key);
  }

  public toDer(): DerEncodedBlob {
    return this.derKey;
  }

  public toRaw(): BinaryBlob {
    return this.rawKey;
  }
}

export class Ed25519KeyIdentity implements Identity {
  public static generate(seed?: Uint8Array): Ed25519KeyIdentity {
    const { publicKey, secretKey } =
      seed === undefined ? tweetnacl.sign.keyPair() : tweetnacl.sign.keyPair.fromSeed(seed);
    return new this(
      Ed25519PublicKey.fromRaw(blobFromUint8Array(publicKey)),
      blobFromUint8Array(secretKey),
    );
  }

  // Derive an Ed25519 key pair according to SLIP 0010:
  // https://github.com/satoshilabs/slips/blob/master/slip-0010.md
  public static async fromSeedWithSlip0010(seed: Uint8Array): Promise<Ed25519KeyIdentity> {
    const encoder = new TextEncoder();
    const rawKey = encoder.encode('ed25519 seed');
    const key = await window.crypto.subtle.importKey(
      'raw',
      rawKey,
      {
        name: 'HMAC',
        hash: { name: 'SHA-512' },
      },
      false,
      ['sign'],
    );
    const result = await window.crypto.subtle.sign('HMAC', key, seed.buffer);
    const slipSeed = new Uint8Array(result.slice(0, 32));
    return this.generate(slipSeed);
  }

  public static fromKeyPair(publicKey: BinaryBlob, privateKey: BinaryBlob): Ed25519KeyIdentity {
    return new Ed25519KeyIdentity(Ed25519PublicKey.fromRaw(publicKey), privateKey);
  }

  protected _publicKey: Ed25519PublicKey;

  // `fromRaw` and `fromDer` should be used for instantiation, not this constructor.
  protected constructor(publicKey: PublicKey, protected _privateKey: BinaryBlob) {
    this._publicKey = Ed25519PublicKey.from(publicKey);
  }

  /**
   * Get the principal represented by this identity. Normally should be a
   * `Principal.selfAuthenticating()`.
   */
  public getPrincipal(): Principal {
    return Principal.selfAuthenticating(this.getDerEncodedPublicKey());
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
        sender_pubkey: this.getDerEncodedPublicKey(),
        sender_sig: sign(requestId, this._privateKey),
      },
    };
  }

  /**
   * Return a copy of the key pair.
   */
  public getKeyPair(): KeyPair {
    return {
      secretKey: blobFromUint8Array(new Uint8Array(this._privateKey)),
      publicKey: this._publicKey,
    };
  }

  /**
   * Return the DER encoded public key.
   */
  protected getDerEncodedPublicKey(): DerEncodedBlob {
    return this._publicKey.toDer();
  }
}
