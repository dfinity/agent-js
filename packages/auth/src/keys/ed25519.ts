import { BinaryBlob, SenderPubKey } from '@dfinity/agent/src';

const;

export class Ed25519Key implements SenderPubKey {
  public static fromRaw(rawKey: BinaryBlob): Ed25519Key {
    return new this(rawKey);
  }

  public static fromDer(derKey: BinaryBlob): Ed25519Key {
    return new this(this.derDecode(derKey));
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

  private static derEncode(publicKey: BinaryBlob): BinaryBlob {
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

    return Buffer.from(derPublicKey) as BinaryBlob;
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
  private derKey: BinaryBlob;

  // `fromRaw` and `fromDer` should be used for instantiation, not this constructor.
  private constructor(key: BinaryBlob) {
    this.rawKey = key;
    this.derKey = Ed25519PublicKey.derEncode(key);
  }

  public toDer(): BinaryBlob {
    return this.derKey;
  }

  public toRaw(): BinaryBlob {
    return this.rawKey;
  }
}
