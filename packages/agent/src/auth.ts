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

export type SenderPubKey = BinaryBlob & { __senderPubKey__: void };
export type SenderSecretKey = BinaryBlob & { __senderSecretKey__: void };
export type SenderDerPubKey = BinaryBlob & { __senderDerPubKey__: void };
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
  return tweetnacl.sign.detached.verify(bufA, senderSig, senderPubKey);
}

export const createKeyPairFromSeed = (seed: Uint8Array): KeyPair => {
  const { publicKey, secretKey } = tweetnacl.sign.keyPair.fromSeed(seed);
  return {
    publicKey: Buffer.from(publicKey),
    secretKey: Buffer.from(secretKey),
  } as KeyPair;
};

// TODO/Note/XXX(eftychis): Unused for the first pass. This provides
// us with key generation for the client.
export function generateKeyPair(): KeyPair {
  const { publicKey, secretKey } = tweetnacl.sign.keyPair();
  return makeKeyPair(publicKey, secretKey);
}

export function makeKeyPair(publicKey: Uint8Array, secretKey: Uint8Array): KeyPair {
  return {
    publicKey: Buffer.from(publicKey),
    secretKey: Buffer.from(secretKey),
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
        sender_pubkey: derEncodeED25519PublicKey(publicKey),
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

export function derEncodeED25519PublicKey(publicKey: SenderPubKey): SenderDerPubKey {
  assertValidEd25519PublicKey(publicKey);
  // https://github.com/dfinity/agent-js/issues/42#issuecomment-716356288
  const derPublicKey = Uint8Array.from([
    ...[48, 42], // SEQUENCE
    ...[48, 5], // SEQUENCE
    ...[6, 3], // OBJECT
    ...[43, 101, 112], // Ed25519 OID
    ...[3], // OBJECT
    ...[publicKey.byteLength + 1], // BIT STRING
    ...[0], // 'no padding'
    ...new Uint8Array(publicKey),
  ]);
  return Buffer.from(derPublicKey) as SenderDerPubKey;
}

function assertValidEd25519PublicKey(publicKey: ArrayBuffer): void {
  if (publicKey.byteLength !== 32) {
    throw new TypeError(`ed25519 public key must be 32 bytes long`);
  }
}
