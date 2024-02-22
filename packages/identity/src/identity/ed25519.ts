import { bufEquals } from '@dfinity/agent';
import {
  DerEncodedPublicKey,
  KeyPair,
  PublicKey,
  Signature,
  SignIdentity,
  uint8ToBuf,
  ED25519_OID,
  unwrapDER,
  wrapDER,
  fromHex,
  toHex,
  bufFromBufLike,
} from '@dfinity/agent';
import { ed25519 } from '@noble/curves/ed25519';

declare type KeyLike = PublicKey | DerEncodedPublicKey | ArrayBuffer | ArrayBufferView;

function isObject(value: unknown) {
  return value !== null && typeof value === 'object';
}

export class Ed25519PublicKey implements PublicKey {
  /**
   * Construct Ed25519PublicKey from an existing PublicKey
   * @param {unknown} maybeKey - existing PublicKey, ArrayBuffer, DerEncodedPublicKey, or hex string
   * @returns {Ed25519PublicKey} Instance of Ed25519PublicKey
   */
  public static from(maybeKey: unknown): Ed25519PublicKey {
    if (typeof maybeKey === 'string') {
      const key = fromHex(maybeKey);
      return this.fromRaw(key);
    } else if (isObject(maybeKey)) {
      const key = maybeKey as KeyLike;
      if (isObject(key) && Object.hasOwnProperty.call(key, '__derEncodedPublicKey__')) {
        return this.fromDer(key as DerEncodedPublicKey);
      } else if (ArrayBuffer.isView(key)) {
        const view = key as ArrayBufferView;
        return this.fromRaw(bufFromBufLike(view.buffer));
      } else if (key instanceof ArrayBuffer) {
        return this.fromRaw(key);
      } else if ('rawKey' in key) {
        return this.fromRaw(key.rawKey as ArrayBuffer);
      } else if ('derKey' in key) {
        return this.fromDer(key.derKey as DerEncodedPublicKey);
      } else if ('toDer' in key) {
        return this.fromDer(key.toDer() as ArrayBuffer);
      }
    }
    throw new Error('Cannot construct Ed25519PublicKey from the provided key.');
  }

  public static fromRaw(rawKey: ArrayBuffer): Ed25519PublicKey {
    return new Ed25519PublicKey(rawKey);
  }

  public static fromDer(derKey: DerEncodedPublicKey): Ed25519PublicKey {
    return new Ed25519PublicKey(this.derDecode(derKey));
  }

  // The length of Ed25519 public keys is always 32 bytes.
  private static RAW_KEY_LENGTH = 32;

  private static derEncode(publicKey: ArrayBuffer): DerEncodedPublicKey {
    const key = wrapDER(publicKey, ED25519_OID).buffer as DerEncodedPublicKey;
    key.__derEncodedPublicKey__ = undefined;
    return key;
  }

  private static derDecode(key: DerEncodedPublicKey): ArrayBuffer {
    const unwrapped = unwrapDER(key, ED25519_OID);
    if (unwrapped.length !== this.RAW_KEY_LENGTH) {
      throw new Error('An Ed25519 public key must be exactly 32bytes long');
    }
    return unwrapped;
  }

  #rawKey: ArrayBuffer;

  public get rawKey(): ArrayBuffer {
    return this.#rawKey;
  }

  #derKey: DerEncodedPublicKey;

  public get derKey(): DerEncodedPublicKey {
    return this.#derKey;
  }

  // `fromRaw` and `fromDer` should be used for instantiation, not this constructor.
  private constructor(key: ArrayBuffer) {
    if (key.byteLength !== Ed25519PublicKey.RAW_KEY_LENGTH) {
      throw new Error('An Ed25519 public key must be exactly 32bytes long');
    }
    this.#rawKey = key;
    this.#derKey = Ed25519PublicKey.derEncode(key);
  }

  public toDer(): DerEncodedPublicKey {
    return this.derKey;
  }

  public toRaw(): ArrayBuffer {
    return this.rawKey;
  }
}

/**
 * Ed25519KeyIdentity is an implementation of SignIdentity that uses Ed25519 keys. This class is used to sign and verify messages for an agent.
 */
export class Ed25519KeyIdentity extends SignIdentity {
  /**
   * Generate a new Ed25519KeyIdentity.
   * @param seed a 32-byte seed for the private key. If not provided, a random seed will be generated.
   * @returns Ed25519KeyIdentity
   */
  public static generate(seed?: Uint8Array): Ed25519KeyIdentity {

    if (seed && seed.length !== 32) {
      throw new Error('Ed25519 Seed needs to be 32 bytes long.');
    }
    if (!seed) seed = ed25519.utils.randomPrivateKey();
    // Check if the seed is all zeros
    if(bufEquals(seed, new Uint8Array(new Array(32).fill(0)))) {
      console.warn('Seed is all zeros. This is not a secure seed. Please provide a seed with sufficient entropy if this is a production environment.');
    }
    const sk = new Uint8Array(32);
    for (let i = 0; i < 32; i++) sk[i] = new Uint8Array(seed)[i];

    const pk = ed25519.getPublicKey(sk);
    return Ed25519KeyIdentity.fromKeyPair(pk, sk);
  }

  public static fromParsedJson(obj: JsonnableEd25519KeyIdentity): Ed25519KeyIdentity {
    const [publicKeyDer, privateKeyRaw] = obj;
    return new Ed25519KeyIdentity(
      Ed25519PublicKey.fromDer(fromHex(publicKeyDer) as DerEncodedPublicKey),
      fromHex(privateKeyRaw),
    );
  }

  public static fromJSON(json: string): Ed25519KeyIdentity {
    const parsed = JSON.parse(json);
    if (Array.isArray(parsed)) {
      if (typeof parsed[0] === 'string' && typeof parsed[1] === 'string') {
        return this.fromParsedJson([parsed[0], parsed[1]]);
      } else {
        throw new Error('Deserialization error: JSON must have at least 2 items.');
      }
    }
    throw new Error(`Deserialization error: Invalid JSON type for string: ${JSON.stringify(json)}`);
  }

  public static fromKeyPair(publicKey: ArrayBuffer, privateKey: ArrayBuffer): Ed25519KeyIdentity {
    return new Ed25519KeyIdentity(Ed25519PublicKey.fromRaw(publicKey), privateKey);
  }

  public static fromSecretKey(secretKey: ArrayBuffer): Ed25519KeyIdentity {
    const publicKey = ed25519.getPublicKey(new Uint8Array(secretKey));
    return Ed25519KeyIdentity.fromKeyPair(publicKey, secretKey);
  }

  #publicKey: Ed25519PublicKey;
  #privateKey: Uint8Array;

  // `fromRaw` and `fromDer` should be used for instantiation, not this constructor.
  protected constructor(publicKey: PublicKey, privateKey: ArrayBuffer) {
    super();
    this.#publicKey = Ed25519PublicKey.from(publicKey);
    this.#privateKey = new Uint8Array(privateKey);
  }

  /**
   * Serialize this key to JSON.
   */
  public toJSON(): JsonnableEd25519KeyIdentity {
    return [toHex(this.#publicKey.toDer()), toHex(this.#privateKey)];
  }

  /**
   * Return a copy of the key pair.
   */
  public getKeyPair(): KeyPair {
    return {
      secretKey: this.#privateKey,
      publicKey: this.#publicKey,
    };
  }

  /**
   * Return the public key.
   */
  public getPublicKey(): Required<PublicKey> {
    return this.#publicKey;
  }

  /**
   * Signs a blob of data, with this identity's private key.
   * @param challenge - challenge to sign with this identity's secretKey, producing a signature
   */
  public async sign(challenge: ArrayBuffer): Promise<Signature> {
    const blob = new Uint8Array(challenge);
    // Some implementations of Ed25519 private keys append a public key to the end of the private key. We only want the private key.
    const signature = uint8ToBuf(ed25519.sign(blob, this.#privateKey.slice(0, 32)));
    // add { __signature__: void; } to the signature to make it compatible with the agent

    Object.defineProperty(signature, '__signature__', {
      enumerable: false,
      value: undefined,
    });

    return signature as Signature;
  }

  /**
   * Verify
   * @param sig - signature to verify
   * @param msg - message to verify
   * @param pk - public key
   * @returns - true if the signature is valid, false otherwise
   */
  public static verify(
    sig: ArrayBuffer | Uint8Array | string,
    msg: ArrayBuffer | Uint8Array | string,
    pk: ArrayBuffer | Uint8Array | string,
  ) {
    const [signature, message, publicKey] = [sig, msg, pk].map(x => {
      if (typeof x === 'string') {
        x = fromHex(x);
      }
      if (x instanceof Uint8Array) {
        x = x.buffer;
      }
      return new Uint8Array(x);
    });
    return ed25519.verify(message, signature, publicKey);
  }
}

type PublicKeyHex = string;
type SecretKeyHex = string;
export type JsonnableEd25519KeyIdentity = [PublicKeyHex, SecretKeyHex];
