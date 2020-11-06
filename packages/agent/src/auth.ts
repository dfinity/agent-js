import { Buffer } from 'buffer/';
import * as tweetnacl from 'tweetnacl';
import {
  AuthHttpAgentRequestTransformFn,
  HttpAgentRequest,
  SignedHttpAgentRequest,
} from './http_agent_types';
import { RequestId, requestIdOf } from './request_id';
import { BinaryBlob } from './types';

const domainSeparator = Buffer.from('\x0Aic-request');

export interface SenderPubKey {
  // Get the public key bytes in its raw unencoded form.
  toRaw(): BinaryBlob;

  // Get the public key bytes encoded with DER.
  toDer(): BinaryBlob;
}
export type SenderSecretKey = BinaryBlob & { __senderSecretKey__: void };
export type SenderSig = BinaryBlob & { __senderSig__: void };

export interface KeyPair {
  publicKey: SenderPubKey;
  secretKey: SenderSecretKey;
}

export function sign(requestId: RequestId, secretKey: SenderSecretKey): SenderSig {
  const bufA = Buffer.concat([domainSeparator, requestId]);
  const signature = tweetnacl.sign.detached(bufA, secretKey);
  return Buffer.from(signature) as SenderSig;
}

export function verify(
  requestId: RequestId,
  senderSig: SenderSig,
  senderPubKey: SenderPubKey,
): boolean {
  const bufA = Buffer.concat([domainSeparator, requestId]);
  return tweetnacl.sign.detached.verify(bufA, senderSig, senderPubKey.toRaw());
}

export const createKeyPairFromSeed = (seed: Uint8Array): KeyPair => {
  const { publicKey, secretKey } = tweetnacl.sign.keyPair.fromSeed(seed);
  return makeEd25519KeyPair(publicKey, secretKey);
};

// TODO/Note/XXX(eftychis): Unused for the first pass. This provides
// us with key generation for the client.
export function generateEd25519KeyPair(): KeyPair {
  const { publicKey, secretKey } = tweetnacl.sign.keyPair();
  return makeEd25519KeyPair(publicKey, secretKey);
}

export function makeEd25519KeyPair(publicKey: Uint8Array, secretKey: Uint8Array): KeyPair {
  return {
    publicKey: Ed25519PublicKey.fromRaw(Buffer.from(publicKey) as BinaryBlob),
    secretKey: Buffer.from(secretKey) as SenderSecretKey,
  } as KeyPair;
}

export type SigningConstructedFn = (requestId: RequestId, secretKey: SenderSecretKey) => SenderSig;

export function makeAuthTransform(
  keyPair: KeyPair,
  senderSigFn: SigningConstructedFn = sign,
): AuthHttpAgentRequestTransformFn {
  const { publicKey, secretKey } = keyPair;

  const fn = async (r: HttpAgentRequest) => {
    const { body, ...fields } = r;
    const requestId = await requestIdOf(body);
    return {
      ...fields,
      body: {
        content: body,
        sender_pubkey: publicKey.toDer(),
        sender_sig: senderSigFn(requestId, secretKey),
      },
    } as SignedHttpAgentRequest;
  };

  return fn;
}

export function makeAnonymousAuthTransform(): AuthHttpAgentRequestTransformFn {
  const fn = async (r: HttpAgentRequest) => {
    const { body, ...fields } = r;
    return {
      ...fields,
      body: {
        content: body,
      },
    } as SignedHttpAgentRequest;
  };

  return fn;
}

export class Ed25519PublicKey implements SenderPubKey {
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
