import { DerEncodedPublicKey, PublicKey, Signature, SignIdentity } from '@dfinity/agent';

/**
 * Options used in a {@link ECDSAKeyIdentity}
 */
export type CryptoKeyOptions = {
  extractable?: boolean;
  keyUsages?: KeyUsage[];
  subtleCrypto?: SubtleCrypto;
};

export class CryptoError extends Error {
  constructor(public readonly message: string) {
    super(message);
    Object.setPrototypeOf(this, CryptoError.prototype);
  }
}

export interface DerCryptoKey extends CryptoKey {
  toDer: () => DerEncodedPublicKey;
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
 * An identity interface that wraps an ECDSA keypair using the P-256 named curve. Supports DER-encoding and decoding for agent calls
 */
export class ECDSAKeyIdentity extends SignIdentity {
  /**
   * Generates a randomly generated identity for use in calls to the Internet Computer.
   * @param {CryptoKeyOptions} options optional settings
   * @param {CryptoKeyOptions['extractable']} options.extractable - whether the key should allow itself to be used. Set to false for maximum security.
   * @param {CryptoKeyOptions['keyUsages']} options.keyUsages - a list of key usages that the key can be used for
   * @param {CryptoKeyOptions['subtleCrypto']} options.subtleCrypto interface
   * @constructs ECDSAKeyIdentity
   * @returns a {@link ECDSAKeyIdentity}
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
    const derKey = (await effectiveCrypto.exportKey(
      'spki',
      keyPair.publicKey,
    )) as DerEncodedPublicKey;

    return new this(keyPair, derKey, effectiveCrypto);
  }

  /**
   * generates an identity from a public and private key. Please ensure that you are generating these keys securely and protect the user's private key
   * @param keyPair a {@link CryptoKeyPair}
   * @param subtleCrypto a {@link SubtleCrypto} interface in case one is not available globally
   * @returns an {@link ECDSAKeyIdentity}
   */
  public static async fromKeyPair(
    keyPair: CryptoKeyPair | { privateKey: CryptoKey; publicKey: CryptoKey },
    subtleCrypto?: SubtleCrypto,
  ): Promise<ECDSAKeyIdentity> {
    const effectiveCrypto = _getEffectiveCrypto(subtleCrypto);
    const derKey = (await effectiveCrypto.exportKey(
      'spki',
      keyPair.publicKey,
    )) as DerEncodedPublicKey;
    return new ECDSAKeyIdentity(keyPair, derKey, effectiveCrypto);
  }

  protected _derKey: DerEncodedPublicKey;
  protected _keyPair: CryptoKeyPair;
  protected _subtleCrypto: SubtleCrypto;

  // `fromKeyPair` and `generate` should be used for instantiation, not this constructor.
  protected constructor(
    keyPair: CryptoKeyPair,
    derKey: DerEncodedPublicKey,
    subtleCrypto: SubtleCrypto,
  ) {
    super();
    this._keyPair = keyPair;
    this._derKey = derKey;
    this._subtleCrypto = subtleCrypto;
  }

  /**
   * Return the internally-used key pair.
   * @returns a {@link CryptoKeyPair}
   */
  public getKeyPair(): CryptoKeyPair {
    return this._keyPair;
  }

  /**
   * Return the public key.
   * @returns an {@link DerCryptoKey}
   */
  public getPublicKey(): DerCryptoKey {
    const derKey = this._derKey;
    const key: DerCryptoKey = Object.create(this._keyPair.publicKey);
    key.toDer = function () {
      return derKey;
    };

    return key;
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
}

export default ECDSAKeyIdentity;
