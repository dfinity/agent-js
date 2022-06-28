import { DerEncodedPublicKey, KeyPair, PublicKey, Signature, SignIdentity } from '@dfinity/agent';
import { ED25519_OID, unwrapDER, wrapDER } from './der';

type extractable = boolean;
type CryptoKeyOptions = [extractable, KeyUsage[]];

export class EcdsaPublicKey implements PublicKey {
  private static derEncode(publicKey: ArrayBuffer): DerEncodedPublicKey {
    // TODO - replace placeholder DER logic
    return wrapDER(publicKey, ED25519_OID).buffer as DerEncodedPublicKey;
  }
  private static derDecode(key: DerEncodedPublicKey): ArrayBuffer {
    const unwrapped = unwrapDER(key, ED25519_OID);
    return unwrapped;
  }
  private readonly key: CryptoKey;
  private readonly derKey: DerEncodedPublicKey;

  /**
   *
   * @param {ArrayBuffer} rawKey
   * @param {CryptoKeyOptions} cryptoKeyOptions
   * @returns
   */
  public async fromRaw(
    rawKey: ArrayBuffer,
    cryptoKeyOptions?: CryptoKeyOptions,
  ): Promise<EcdsaPublicKey> {
    const configurableOptions = cryptoKeyOptions ?? [false, ['sign', 'verify']];
    const options = ['raw', rawKey, 'ecdsa', ...configurableOptions];
    const key = await SubtleCrypto.prototype.importKey.call(this, ...options);
    return new EcdsaPublicKey(rawKey, key);
  }

  public static fromDer(derKey: DerEncodedPublicKey): EcdsaPublicKey {
    return new EcdsaPublicKey(this.derDecode(derKey));
  }

  private constructor(rawKey: ArrayBuffer, key: CryptoKey) {
    this.key = key;
    this.derKey = EcdsaPublicKey.derEncode(rawKey);
  }

  public toDer(): DerEncodedPublicKey {
    return this.derKey;
  }
}
export class EcdsaKeyIdentity {}
