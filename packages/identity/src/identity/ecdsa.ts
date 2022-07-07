import { DerEncodedPublicKey, Signature, SignIdentity } from '@dfinity/agent';
import { SECP256K1_OID, unwrapDER, wrapDER } from './der';

export type CryptoKeyOptions = { extractable: boolean; keyUsages: KeyUsage[] };

export class ExtractrableKeyError extends Error {
  constructor(public readonly message: string) {
    super(message);
    Object.setPrototypeOf(this, ExtractrableKeyError.prototype);
  }
}

interface CryptoPublicKey extends CryptoKey {
  toDer(): DerEncodedPublicKey;
}

export class ECDSAPublicKey implements CryptoPublicKey {
  private static derEncode(publicKey: ArrayBuffer): DerEncodedPublicKey {
    // TODO - replace placeholder DER logic
    return wrapDER(publicKey, SECP256K1_OID).buffer as DerEncodedPublicKey;
  }
  private static derDecode(key: DerEncodedPublicKey): ArrayBuffer {
    const unwrapped = unwrapDER(key, SECP256K1_OID);
    return unwrapped;
  }

  public algorithm: CryptoKey['algorithm'];
  public extractable: CryptoKey['extractable'];
  public type: CryptoKey['type'];
  public usages: CryptoKey['usages'];

  private readonly rawKey: ArrayBuffer | undefined;
  private readonly jwk: JsonWebKey | undefined;
  private readonly derKey: DerEncodedPublicKey | undefined;

  /**
   *
   * @param {JsonWebKey} jwk JSON WebKey
   * @param {CryptoKeyOptions} cryptoKeyOptions
   */
  public static async fromJWK(
    jwk: JsonWebKey,
    cryptoKeyOptions?: CryptoKeyOptions,
  ): Promise<ECDSAPublicKey> {
    const { extractable = true, keyUsages = [] } = cryptoKeyOptions ?? {};
    const key = await crypto.subtle.importKey(
      'jwk',
      jwk,
      {
        name: 'ECDSA',
        namedCurve: 'P-256',
      },
      extractable,
      keyUsages,
    );

    const rawKey = await crypto.subtle.exportKey('raw', key);

    return new ECDSAPublicKey(key, rawKey, jwk);
  }

  public static async fromDer(
    derKey: DerEncodedPublicKey,
    cryptoKeyOptions?: CryptoKeyOptions,
  ): Promise<ECDSAPublicKey> {
    const { extractable = true, keyUsages = [] } = cryptoKeyOptions ?? {};
    const rawKey = ECDSAPublicKey.derDecode(derKey);
    const key = await crypto.subtle.importKey(
      'raw',
      rawKey,
      {
        name: 'ECDSA',
        namedCurve: 'P-256',
      },
      extractable,
      keyUsages,
    );

    const jwk = await crypto.subtle.exportKey('jwk', key);

    return new ECDSAPublicKey(key, rawKey, jwk);
  }

  public static async fromRaw(
    rawKey: ArrayBuffer,
    cryptoKeyOptions?: CryptoKeyOptions,
  ): Promise<ECDSAPublicKey> {
    const { extractable = true, keyUsages = [] } = cryptoKeyOptions ?? {};
    const key = await crypto.subtle.importKey(
      'raw',
      rawKey,
      {
        name: 'ECDSA',
        namedCurve: 'P-256',
      },
      extractable,
      keyUsages,
    );

    const jwk = await crypto.subtle.exportKey('jwk', key);

    return new ECDSAPublicKey(key, rawKey, jwk);
  }

  /**
   * Generates a new ECDSAPublicKey using the ECDSA P-256 curve
   * @param {CryptoKeyOptions} cryptoKeyOptions for extractable flag and KeyUsages
   * @param {boolean} CryptoKeyOptions.extractable
   * @returns
   */
  public static async generate(options?: CryptoKeyOptions): Promise<ECDSAPublicKey> {
    const { extractable = false, keyUsages = ['sign'] } = options ?? {};
    const params = {
      name: 'ECDSA',
      namedCurve: 'P-256',
    };

    const keyPair = await crypto.subtle.generateKey(params, extractable, keyUsages);

    const publicKey = keyPair.publicKey;
    const jwk = await crypto.subtle.exportKey('jwk', publicKey);
    const rawKey = await crypto.subtle.exportKey('raw', publicKey);

    return new ECDSAPublicKey(publicKey, rawKey, jwk);
  }

  private constructor(key: CryptoKey, rawKey?: ArrayBuffer, jwk?: JsonWebKey) {
    this.rawKey = rawKey;

    if (rawKey) {
      this.derKey = ECDSAPublicKey.derEncode(rawKey);
    }
    if (jwk) {
      this.jwk = jwk;
    }

    // Copy attributes from key
    this.algorithm = key.algorithm;
    this.extractable = key.extractable;
    this.type = key.type;
    this.usages = key.usages;
  }

  public toDer(): DerEncodedPublicKey {
    if (!this.derKey) {
      throw new ExtractrableKeyError(
        'Error: could not export key for DER-encoding. If you need to extract this key, set CryptoKeyOptions.extractable to true during creation.',
      );
    }
    return this.derKey;
  }

  public toRaw(): ArrayBuffer {
    if (!this.rawKey) {
      throw new ExtractrableKeyError(
        'Error: could not export raw-encoded key. If you need to extract this key, set CryptoKeyOptions.extractable to true during creation.',
      );
    }
    return this.rawKey;
  }

  public toJwk(): JsonWebKey {
    if (!this.jwk) {
      throw new ExtractrableKeyError(
        'Error: could not export jwk-encoded key. If you need to extract this key, set CryptoKeyOptions.extractable to true during creation.',
      );
    }
    return this.jwk;
  }
}

export class ECDSAKeyIdentity extends SignIdentity {
  /**
   * Generates an identity. If a seed is provided, the keys are generated from the
   * seed according to BIP 0032. Otherwise, the key pair is randomly generated.
   * This method throws an error in case the seed is not 32 bytes long or invalid
   * for use as a private key.
   * @param {Uint8Array} seed the optional seed
   * @returns {ECDSAKeyIdentity}
   */
  public static async generate(options?: CryptoKeyOptions): Promise<ECDSAKeyIdentity> {
    const { extractable = false, keyUsages = ['sign', 'verify'] } = options ?? {};
    const keyPair = await crypto.subtle.generateKey(
      {
        name: 'ECDSA',
        namedCurve: 'P-256',
      },
      extractable,
      keyUsages,
    );

    const rawKey = await ECDSAKeyIdentity.keyPairToPublicKey(keyPair);

    return new this(keyPair, rawKey);
  }

  /**
   * generates an identity from a public and private key. Please ensure that you are generating these keys securely and protect the user's private key
   * @param {ArrayBuffer} publicKey
   * @param {ArrayBuffer} privateKey
   * @returns {ECDSAKeyIdentity}
   */
  public static async fromKeyPair(keyPair: CryptoKeyPair): Promise<ECDSAKeyIdentity> {
    const rawKey = await ECDSAKeyIdentity.keyPairToPublicKey(keyPair);
    return new ECDSAKeyIdentity(keyPair, rawKey);
  }

  protected _publicKey: ECDSAPublicKey;
  protected _keyPair: CryptoKeyPair;

  protected constructor(keyPair: CryptoKeyPair, publicKey: ECDSAPublicKey) {
    super();
    this._keyPair = keyPair;
    this._publicKey = publicKey;
  }

  /**
   * Return a copy of the key pair.
   * @returns {CryptoKeyPair}
   */
  public getKeyPair(): CryptoKeyPair {
    return this._keyPair;
  }

  /**
   * Return the public key.
   * @returns {ECDSAPublicKey}
   */
  public getPublicKey(): ECDSAPublicKey {
    return this._publicKey;
  }

  /**
   * Signs a blob of data, with this identity's private key.
   * @param {ArrayBuffer} challenge - challenge to sign with this identity's secretKey, producing a signature
   * @returns {Promise<Signature>} signature
   */
  public async sign(challenge: ArrayBuffer): Promise<Signature> {
    const params: EcdsaParams = {
      name: 'ECDSA',
      hash: { name: 'SHA-256' },
    };
    this._keyPair.privateKey; //?
    const signature = await crypto.subtle.sign(params, this._keyPair.privateKey, challenge);

    return signature as Signature;
  }

  private static async keyPairToPublicKey(keyPair: CryptoKeyPair): Promise<ECDSAPublicKey> {
    return await ECDSAPublicKey.fromRaw(await crypto.subtle.exportKey('raw', keyPair.publicKey));
  }
}

export default ECDSAKeyIdentity;
