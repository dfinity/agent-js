/* eslint-disable no-underscore-dangle */
import { DerEncodedPublicKey, KeyPair, Signature } from '@dfinity/agent';
import Secp256k1 from 'secp256k1';
import { sha256 } from 'js-sha256';
import { randomBytes } from 'tweetnacl';
import { PublicKey, SignIdentity } from '@dfinity/agent';
import { fromHexString, toHexString } from '../buffer';
import { SECP256K1_OID, unwrapDER, wrapDER } from './der';

declare type PublicKeyHex = string;
declare type SecretKeyHex = string;
export declare type JsonableSecp256k1Identity = [PublicKeyHex, SecretKeyHex];

export class Secp256k1PublicKey implements PublicKey {
  /**
   * Construct Secp256k1PublicKey from an existing PublicKey
   * @param {PublicKey} key
   * @returns {Secp256k1PublicKey} Instance of Secp256k1PublicKey
   */
  public static from(key: PublicKey): Secp256k1PublicKey {
    return this.fromDer(key.toDer());
  }

  public static fromRaw(rawKey: ArrayBuffer): Secp256k1PublicKey {
    return new Secp256k1PublicKey(rawKey);
  }

  public static fromDer(derKey: DerEncodedPublicKey): Secp256k1PublicKey {
    return new Secp256k1PublicKey(this.derDecode(derKey));
  }

  private static derEncode(publicKey: ArrayBuffer): DerEncodedPublicKey {
    return wrapDER(publicKey, SECP256K1_OID).buffer as DerEncodedPublicKey;
  }

  private static derDecode(key: DerEncodedPublicKey): ArrayBuffer {
    return unwrapDER(key, SECP256K1_OID);
  }

  private readonly rawKey: ArrayBuffer;

  private readonly derKey: DerEncodedPublicKey;

  // `fromRaw` and `fromDer` should be used for instantiation, not this constructor.
  private constructor(key: ArrayBuffer) {
    key.byteLength;
    this.rawKey = key;
    this.derKey = Secp256k1PublicKey.derEncode(key);
  }

  public toDer(): DerEncodedPublicKey {
    return this.derKey;
  }

  public toRaw(): ArrayBuffer {
    return this.rawKey;
  }
}

export class Secp256k1KeyIdentity extends SignIdentity {
  /**
   * Generates an identity. If a seed is provided, the keys are generated from the
   * seed according to BIP 0032. Otherwise, the key pair is randomly generated.
   * This method throws an error in case the seed is not 32 bytes long or invalid
   * for use as a private key.
   * @param {Uint8Array} seed the optional seed
   * @returns {Secp256k1KeyIdentity}
   */
  public static generate(seed?: Uint8Array): Secp256k1KeyIdentity {
    if (seed && seed.byteLength !== 32) {
      throw new Error('Secp256k1 Seed needs to be 32 bytes long.');
    }
    let privateKey: Uint8Array;

    if (seed) {
      // private key from seed according to https://en.bitcoin.it/wiki/BIP_0032
      // master key generation:
      privateKey = seed;
      if (!Secp256k1.privateKeyVerify(privateKey)) {
        throw new Error('The seed is invalid.');
      }
    } else {
      privateKey = new Uint8Array(randomBytes(32));
      while (!Secp256k1.privateKeyVerify(privateKey)) {
        privateKey = new Uint8Array(randomBytes(32));
      }
    }

    const publicKeyRaw = Secp256k1.publicKeyCreate(privateKey, false);

    const publicKey = Secp256k1PublicKey.fromRaw(publicKeyRaw);
    return new this(publicKey, privateKey);
  }

  public static fromParsedJson(obj: JsonableSecp256k1Identity): Secp256k1KeyIdentity {
    const [publicKeyRaw, privateKeyRaw] = obj;
    return new Secp256k1KeyIdentity(
      Secp256k1PublicKey.fromRaw(fromHexString(publicKeyRaw)),
      fromHexString(privateKeyRaw),
    );
  }

  public static fromJSON(json: string): Secp256k1KeyIdentity {
    const parsed = JSON.parse(json);
    if (Array.isArray(parsed)) {
      if (typeof parsed[0] === 'string' && typeof parsed[1] === 'string') {
        return this.fromParsedJson([parsed[0], parsed[1]]);
      }
      throw new Error('Deserialization error: JSON must have at least 2 items.');
    }
    throw new Error(`Deserialization error: Invalid JSON type for string: ${JSON.stringify(json)}`);
  }

  /**
   * generates an identity from a public and private key. Please ensure that you are generating these keys securely and protect the user's private key
   * @param {ArrayBuffer} publicKey
   * @param {ArrayBuffer} privateKey
   * @returns {Secp256k1KeyIdentity}
   */
  public static fromKeyPair(publicKey: ArrayBuffer, privateKey: ArrayBuffer): Secp256k1KeyIdentity {
    return new Secp256k1KeyIdentity(Secp256k1PublicKey.fromRaw(publicKey), privateKey);
  }

  /**
   * generates an identity from an existing secret key, and is the correct method to generate an identity from a seed phrase. Please ensure you protect the user's private key.
   * @param {ArrayBuffer} secretKey
   * @returns {Secp256k1KeyIdentity}
   */
  public static fromSecretKey(secretKey: ArrayBuffer): Secp256k1KeyIdentity {
    const publicKey = Secp256k1.publicKeyCreate(new Uint8Array(secretKey), false);
    const identity = Secp256k1KeyIdentity.fromKeyPair(publicKey, new Uint8Array(secretKey));
    return identity;
  }

  protected _publicKey: Secp256k1PublicKey;

  protected constructor(publicKey: Secp256k1PublicKey, protected _privateKey: ArrayBuffer) {
    super();
    this._publicKey = publicKey;
  }

  /**
   * Serialize this key to JSON-serializable object.
   * @returns {JsonableSecp256k1Identity}
   */
  public toJSON(): JsonableSecp256k1Identity {
    return [toHexString(this._publicKey.toRaw()), toHexString(this._privateKey)];
  }

  /**
   * Return a copy of the key pair.
   * @returns {KeyPair}
   */
  public getKeyPair(): KeyPair {
    return {
      secretKey: this._privateKey,
      publicKey: this._publicKey,
    };
  }

  /**
   * Return the public key.
   * @returns {Secp256k1PublicKey}
   */
  public getPublicKey(): Secp256k1PublicKey {
    return this._publicKey;
  }

  /**
   * Signs a blob of data, with this identity's private key.
   * @param {ArrayBuffer} challenge - challenge to sign with this identity's secretKey, producing a signature
   * @returns {Promise<Signature>} signature
   */
  public async sign(challenge: ArrayBuffer): Promise<Signature> {
    const hash = sha256.create();
    hash.update(challenge);
    const signature = Secp256k1.ecdsaSign(
      new Uint8Array(hash.digest()),
      new Uint8Array(this._privateKey),
    ).signature.buffer;
    return signature as Signature;
  }
}

export default Secp256k1KeyIdentity;
