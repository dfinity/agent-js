import { lebEncode } from '@dfinity/candid';
import * as cbor from 'simple-cbor';
import { AbstractExpiry, Nonce } from '@dfinity/types';
import { Endpoint, HttpAgentRequest, HttpAgentRequestTransformFn } from './types';

/**
 * Create a random Nonce, based on date and a random suffix.
 */
export function makeNonce(): Nonce {
  // Encode 128 bits.
  const buffer = new ArrayBuffer(16);
  const view = new DataView(buffer);
  const now = BigInt(+Date.now());
  const randHi = Math.floor(Math.random() * 0xffffffff);
  const randLo = Math.floor(Math.random() * 0xffffffff);
  // Fix for IOS < 14.8 setBigUint64 absence
  if (typeof view.setBigUint64 === 'function') {
    view.setBigUint64(0, now);
  } else {
    const TWO_TO_THE_32 = BigInt(1) << BigInt(32);
    view.setUint32(0, Number(now >> BigInt(32)));
    view.setUint32(4, Number(now % TWO_TO_THE_32));
  }
  view.setUint32(8, randHi);
  view.setUint32(12, randLo);

  return buffer as Nonce;
}

const NANOSECONDS_PER_MILLISECONDS = BigInt(1_000_000);

const REPLICA_PERMITTED_DRIFT_MILLISECONDS = BigInt(60 * 1000);

export class Expiry implements AbstractExpiry {
  private readonly _value: bigint;

  constructor(deltaInMSec: number) {
    // Use bigint because it can overflow the maximum number allowed in a double float.;
    this._value =
      (BigInt(Date.now()) + BigInt(deltaInMSec) - REPLICA_PERMITTED_DRIFT_MILLISECONDS) *
      NANOSECONDS_PER_MILLISECONDS;
  }

  public toCBOR(): cbor.CborValue {
    // TODO: change this to take the minimum amount of space (it always takes 8 bytes now).
    return cbor.value.u64(this._value.toString(16), 16);
  }

  public toHash(): ArrayBuffer {
    return lebEncode(this._value);
  }
}

/**
 * Create a Nonce transform, which takes a function that returns a Buffer, and adds it
 * as the nonce to every call requests.
 * @param nonceFn A function that returns a buffer. By default uses a semi-random method.
 */
export function makeNonceTransform(nonceFn: () => Nonce = makeNonce): HttpAgentRequestTransformFn {
  return async (request: HttpAgentRequest) => {
    // Nonce needs to be inserted into the header for all requests, to enable logs to be correlated with requests.
    const headers = request.request.headers ? new Headers(request.request.headers) : new Headers();
    // TODO: uncomment this when the http proxy supports it.
    // headers.set('X-IC-Request-ID', toHex(new Uint8Array(nonce)));
    request.request.headers = headers;

    // Nonce only needs to be inserted into the body for async calls, to prevent replay attacks.
    if (request.endpoint === Endpoint.Call) {
      request.body.nonce = nonceFn();
    }
  };
}

/**
 * Create a transform that adds a delay (by default 5 minutes) to the expiry.
 *
 * @param delayInMilliseconds The delay to add to the call time, in milliseconds.
 */
export function makeExpiryTransform(delayInMilliseconds: number): HttpAgentRequestTransformFn {
  return async (request: HttpAgentRequest) => {
    request.body.ingress_expiry = new Expiry(delayInMilliseconds);
  };
}
