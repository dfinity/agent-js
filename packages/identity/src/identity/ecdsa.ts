import { DerEncodedPublicKey } from '@dfinity/agent';
// import { randomBytes } from 'tweetnacl';
import { SECP256K1_OID, unwrapDER, wrapDER } from './der';

type CryptoKeyOptions = { extractable: boolean; keyUsages: KeyUsage[] };

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

  // /**
  //  *
  //  * @param {ArrayBuffer} rawKey
  //  * @param {CryptoKeyOptions} cryptoKeyOptions
  //  * @returns
  //  */
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

  /**
   * Generates a new ECDSAPublicKey using the ECDSA P-256 curve
   * @param {CryptoKeyOptions} cryptoKeyOptions for extractable flag and KeyUsages
   * @param {boolean} CryptoKeyOptions.extractable
   * @returns
   */
  public static async generate(): Promise<ECDSAPublicKey> {
    const params = {
      name: 'ECDSA',
      namedCurve: 'P-256',
    };

    const keyPair = await crypto.subtle.generateKey(params, false, []);

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
export class ECDSAKeyIdentity {}
