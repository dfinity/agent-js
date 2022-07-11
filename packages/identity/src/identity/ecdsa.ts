import { DerEncodedPublicKey, PublicKey, Signature, SignIdentity } from '@dfinity/agent';
import { SECP256K1_OID, unwrapDER, wrapDER } from './der';

/**
 * Options used in an {@link ECDSAPublicKey} or {@link ECDSAKeyIdentity}
 */
export type CryptoKeyOptions = {
  extractable?: boolean;
  keyUsages?: KeyUsage[];
  subtleCrypto?: SubtleCrypto;
};

export class ExtractrableKeyError extends Error {
  constructor(public readonly message: string) {
    super(message);
    Object.setPrototypeOf(this, ExtractrableKeyError.prototype);
  }
}

export class CryptoError extends Error {
  constructor(public readonly message: string) {
    super(message);
    Object.setPrototypeOf(this, ExtractrableKeyError.prototype);
  }
}

/**
 * Utility method to ensure that a subtleCrypto implementation is provided or is available in the global context
 * @param subtleCrypto SubtleCrypto implementation
 * @returns subleCrypto
 */
function _getEffectiveCrypto(subtleCrypto: CryptoKeyOptions['subtleCrypto']): SubtleCrypto {
  if (subtleCrypto) {
    return subtleCrypto;
  } else if (typeof crypto !== 'undefined' && crypto['subtle']) {
    return crypto.subtle;
  } else {
    throw new CryptoError(
      'Global crypto was not available and none was provided. Please inlcude a SubtleCrypto implementation. See https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto',
    );
  }
}

/**
 * A public key interface that wraps an ECDSA key using the P-256 named curve. Supports DER-encoding and decoding for agent calls
 */
export class ECDSAPublicKey implements PublicKey {
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
   * Creates a ECDSAPublicKey from a JsonWebKey
   * @param jwk a JsonWebKey
   * @param {CryptoKeyOptions} cryptoKeyOptions optional settings
   * @param {CryptoKeyOptions['extractable']} cryptoKeyOptions.extractable - whether the key should allow itself to be used. Set to false for maximum security.
   * @param {CryptoKeyOptions['keyUsages']} cryptoKeyOptions.keyUsages - a list of key usages that the key can be used for
   * @param {CryptoKeyOptions['subtleCrypto']} cryptoKeyOptions.subtleCrypto interface
   * @constructs ECDSAPublicKey
   */
  public static async fromJWK(
    jwk: JsonWebKey,
    cryptoKeyOptions?: CryptoKeyOptions,
  ): Promise<ECDSAPublicKey> {
    const { extractable = true, keyUsages = [], subtleCrypto } = cryptoKeyOptions ?? {};
    const effectiveCrypto = _getEffectiveCrypto(subtleCrypto);

    const key = await effectiveCrypto.importKey(
      'jwk',
      jwk,
      {
        name: 'ECDSA',
        namedCurve: 'P-256',
      },
      extractable,
      keyUsages,
    );

    const rawKey = await effectiveCrypto.exportKey('raw', key);

    return new ECDSAPublicKey(key, rawKey, jwk);
  }

  /**
   * Constructs a ECDSAPublicKey from a DER-encoded raw key
   * @param derKey a DerEncodedPublicKey
   * @param {CryptoKeyOptions} cryptoKeyOptions optional settings
   * @param {CryptoKeyOptions['extractable']} cryptoKeyOptions.extractable - whether the key should allow itself to be used. Set to false for maximum security.
   * @param {CryptoKeyOptions['keyUsages']} cryptoKeyOptions.keyUsages - a list of key usages that the key can be used for
   * @param {CryptoKeyOptions['subtleCrypto']} cryptoKeyOptions.subtleCrypto interface
   * @constructs ECDSAPublicKey
   */
  public static async fromDer(
    derKey: DerEncodedPublicKey,
    cryptoKeyOptions?: CryptoKeyOptions,
  ): Promise<ECDSAPublicKey> {
    const { extractable = true, keyUsages = [], subtleCrypto } = cryptoKeyOptions ?? {};
    const effectiveCrypto = _getEffectiveCrypto(subtleCrypto);
    const rawKey = ECDSAPublicKey.derDecode(derKey);
    const key = await effectiveCrypto.importKey(
      'raw',
      rawKey,
      {
        name: 'ECDSA',
        namedCurve: 'P-256',
      },
      extractable,
      keyUsages,
    );

    const jwk = await effectiveCrypto.exportKey('jwk', key);

    return new ECDSAPublicKey(key, rawKey, jwk);
  }

  /**
   * Constructs a ECDSAPublicKey from a raw key
   * @param rawKey a raw encoded public key ArrayBuffer
   * @param {CryptoKeyOptions} cryptoKeyOptions optional settings
   * @param {CryptoKeyOptions['extractable']} cryptoKeyOptions.extractable - whether the key should allow itself to be used. Set to false for maximum security.
   * @param {CryptoKeyOptions['keyUsages']} cryptoKeyOptions.keyUsages - a list of key usages that the key can be used for
   * @param {CryptoKeyOptions['subtleCrypto']} cryptoKeyOptions.subtleCrypto interface
   * @constructs ECDSAPublicKey
   */
  public static async fromRaw(
    rawKey: ArrayBuffer,
    cryptoKeyOptions?: CryptoKeyOptions,
  ): Promise<ECDSAPublicKey> {
    const { extractable = true, keyUsages = [], subtleCrypto } = cryptoKeyOptions ?? {};
    const effectiveCrypto = _getEffectiveCrypto(subtleCrypto);
    const key = await effectiveCrypto.importKey(
      'raw',
      rawKey,
      {
        name: 'ECDSA',
        namedCurve: 'P-256',
      },
      extractable,
      keyUsages,
    );

    const jwk = await effectiveCrypto.exportKey('jwk', key);

    return new ECDSAPublicKey(key, rawKey, jwk);
  }

  /**
   * Generates a new ECDSAPublicKey using the ECDSA P-256 curve
   * @param {CryptoKeyOptions} options optional settings
   * @param {CryptoKeyOptions['extractable']} options.extractable - whether the key should allow itself to be used. Set to false for maximum security.
   * @param {CryptoKeyOptions['keyUsages']} options.keyUsages - a list of key usages that the key can be used for
   * @param {CryptoKeyOptions['subtleCrypto']} options.subtleCrypto interface
   * @constructs ECDSAPublicKey
   */
  public static async generate(options?: CryptoKeyOptions): Promise<ECDSAPublicKey> {
    const { extractable = false, keyUsages = ['sign'], subtleCrypto } = options ?? {};
    subtleCrypto;
    const effectiveCrypto = _getEffectiveCrypto(subtleCrypto);
    const params = {
      name: 'ECDSA',
      namedCurve: 'P-256',
    };

    const keyPair = await effectiveCrypto.generateKey(params, extractable, keyUsages);

    const publicKey = keyPair.publicKey;
    const jwk = await effectiveCrypto.exportKey('jwk', publicKey);
    const rawKey = await effectiveCrypto.exportKey('raw', publicKey);

    return new ECDSAPublicKey(publicKey, rawKey, jwk);
  }

  // `fromJWK`, `fromRaw`, and `fromDer` should be used for instantiation, not this constructor.
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

  /**
   * method to convert an extractable key to a der-encoded ArrayBuffer
   * @returns a {@link DerEncodedPublicKey}
   */
  public toDer(): DerEncodedPublicKey {
    if (!this.derKey) {
      throw new ExtractrableKeyError(
        'Error: could not export key for DER-encoding. If you need to extract this key, set CryptoKeyOptions.extractable to true during creation.',
      );
    }
    return this.derKey;
  }

  /**
   * method to convert an extractable key to a raw ArrayBuffer
   * @returns an ArrayBuffer
   */
  public toRaw(): ArrayBuffer {
    if (!this.rawKey) {
      throw new ExtractrableKeyError(
        'Error: could not export raw-encoded key. If you need to extract this key, set CryptoKeyOptions.extractable to true during creation.',
      );
    }
    return this.rawKey;
  }

  /**
   * method to convert an extractable key to a JsonWebKey
   * @returns a {@link JsonWebKey}
   */
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
    const { extractable = false, keyUsages = ['sign', 'verify'], subtleCrypto } = options ?? {};
    const effectiveCrypto = _getEffectiveCrypto(subtleCrypto);
    const keyPair = await effectiveCrypto.generateKey(
      {
        name: 'ECDSA',
        namedCurve: 'P-256',
      },
      extractable,
      keyUsages,
    );

    const rawKey = await ECDSAKeyIdentity.keyPairToPublicKey(keyPair, subtleCrypto);

    return new this(keyPair, rawKey, effectiveCrypto);
  }

  /**
   * generates an identity from a public and private key. Please ensure that you are generating these keys securely and protect the user's private key
   * @param {ArrayBuffer} publicKey
   * @param {ArrayBuffer} privateKey
   * @returns {ECDSAKeyIdentity}
   */
  public static async fromKeyPair(
    keyPair: CryptoKeyPair,
    subtleCrypto?: SubtleCrypto,
  ): Promise<ECDSAKeyIdentity> {
    const effectiveCrypto = _getEffectiveCrypto(subtleCrypto);
    const rawKey = await ECDSAKeyIdentity.keyPairToPublicKey(keyPair, effectiveCrypto);
    return new ECDSAKeyIdentity(keyPair, rawKey, effectiveCrypto);
  }

  protected _publicKey: ECDSAPublicKey;
  protected _keyPair: CryptoKeyPair;
  protected _subtleCrypto: SubtleCrypto;

  protected constructor(
    keyPair: CryptoKeyPair,
    publicKey: ECDSAPublicKey,
    subtleCrypto: SubtleCrypto,
  ) {
    super();
    this._keyPair = keyPair;
    this._publicKey = publicKey;
    this._subtleCrypto = subtleCrypto;
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
    this._keyPair.privateKey;
    const signature = await this._subtleCrypto.sign(params, this._keyPair.privateKey, challenge);

    return signature as Signature;
  }

  private static async keyPairToPublicKey(
    keyPair: CryptoKeyPair,
    subtleCrypto?: CryptoKeyOptions['subtleCrypto'],
  ): Promise<ECDSAPublicKey> {
    const effectiveCrypto = _getEffectiveCrypto(subtleCrypto);
    return await ECDSAPublicKey.fromRaw(await effectiveCrypto.exportKey('raw', keyPair.publicKey), {
      subtleCrypto: effectiveCrypto,
    });
  }
}

export default ECDSAKeyIdentity;
