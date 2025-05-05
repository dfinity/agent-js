import { BLS12_381_G2_OID, SignIdentity, wrapDER } from '@dfinity/agent';
import { Ed25519KeyIdentity } from '@dfinity/identity';
import { randomBytes } from 'crypto';
import { bls12_381 as bls } from '@noble/curves/bls12-381';

/**
 * Generates a random identity using Ed25519KeyIdentity.
 * @returns {SignIdentity} A new random identity.
 */
export function randomIdentity(): SignIdentity {
  return Ed25519KeyIdentity.generate(randomBytes(32));
}

export interface KeyPair {
  publicKey: Uint8Array;
  publicKeyDer: Uint8Array;
  privateKey: Uint8Array;
}

/**
 * Generates a random key pair.
 * @returns {KeyPair} A new random key pair.
 */
export function randomKeyPair(): KeyPair {
  const privateKey = bls.utils.randomPrivateKey();
  const publicKey = bls.getPublicKeyForShortSignatures(privateKey);
  const publicKeyDer = wrapDER(publicKey, BLS12_381_G2_OID);

  return { publicKey, privateKey, publicKeyDer };
}

/**
 * Signs a message using the provided private key.
 * @param {Uint8Array | ArrayBuffer} message - The message to sign.
 * @param {Uint8Array} privateKey - The private key to sign the message with.
 * @returns {Uint8Array} The signature of the message.
 */
export function sign(message: Uint8Array | ArrayBuffer, privateKey: Uint8Array): Uint8Array {
  return bls.signShortSignature(new Uint8Array(message), privateKey);
}
