import {
  BinaryBlob,
  blobFromUint8Array,
  derBlobFromBlob,
  DerEncodedBlob,
  HttpAgentRequest,
  Identity,
  Principal,
  PublicKey,
  RequestId,
  requestIdOf,
} from '@dfinity/agent';
import * as tweetnacl from 'tweetnacl';

const domainSeparator = Buffer.from('\x0Aic-request');

function sign(requestId: RequestId, secretKey: BinaryBlob): BinaryBlob {
  const bufA = Buffer.concat([domainSeparator, requestId]);
  const signature = tweetnacl.sign.detached(bufA, secretKey);
  return blobFromUint8Array(signature);
}

export class Ed25519PublicKey implements PublicKey {
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

  private rawKey: BinaryBlob;
  private derKey: DerEncodedBlob;

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
    return new this(blobFromUint8Array(publicKey), blobFromUint8Array(secretKey));
  }

  public static fromKeyPair(publicKey: BinaryBlob, privateKey: BinaryBlob): Ed25519KeyIdentity {
    return new Ed25519KeyIdentity(publicKey, privateKey);
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
    ...[Ed25519KeyIdentity.RAW_KEY_LENGTH + 1], // BIT STRING
    ...[0], // 'no padding'
  ]);

  private static derEncode(publicKey: BinaryBlob): DerEncodedBlob {
    if (publicKey.byteLength !== Ed25519KeyIdentity.RAW_KEY_LENGTH) {
      throw new TypeError(
        `ed25519 public key must be ${Ed25519KeyIdentity.RAW_KEY_LENGTH} bytes long`,
      );
    }

    // https://github.com/dfinity/agent-js/issues/42#issuecomment-716356288
    const derPublicKey = Uint8Array.from([
      ...Ed25519KeyIdentity.DER_PREFIX,
      ...new Uint8Array(publicKey),
    ]);

    return derBlobFromBlob(blobFromUint8Array(derPublicKey));
  }

  private static derDecode(key: BinaryBlob): BinaryBlob {
    const expectedLength = Ed25519KeyIdentity.DER_PREFIX.length + Ed25519KeyIdentity.RAW_KEY_LENGTH;
    if (key.byteLength !== expectedLength) {
      throw new TypeError(`Ed25519 DER-encoded public key must be ${expectedLength} bytes long`);
    }

    const rawKey = key.subarray(Ed25519KeyIdentity.DER_PREFIX.length) as BinaryBlob;
    if (!this.derEncode(rawKey).equals(key)) {
      throw new TypeError(
        'Ed25519 DER-encoded public key is invalid. A valid Ed25519 DER-encoded public key ' +
          `must have the following prefix: ${Ed25519KeyIdentity.DER_PREFIX}`,
      );
    }

    return rawKey;
  }

  private _derKey: DerEncodedBlob | null = null;

  // `fromRaw` and `fromDer` should be used for instantiation, not this constructor.
  private constructor(private _publicKey: BinaryBlob, private _privateKey: BinaryBlob) {}

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
   * Return the DER encoded public key.
   */
  protected getDerEncodedPublicKey(): DerEncodedBlob {
    if (!this._derKey) {
      this._derKey = Ed25519KeyIdentity.derEncode(this._publicKey);
    }

    return this._derKey;
  }
}
