import { lebEncode } from '@dfinity/candid';
import * as cbor from 'simple-cbor';
import { Endpoint, HttpAgentRequest, HttpAgentRequestTransformFn, makeNonce, Nonce } from './types';

const NANOSECONDS_PER_MILLISECONDS = BigInt(1000000);

const REPLICA_PERMITTED_DRIFT_MILLISECONDS = BigInt(60 * 1000);

export class Expiry {
  private readonly _value: bigint;

  constructor(deltaInMSec: number) {
    // Use bigint because it can overflow the maximum number allowed in a double float.
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
    // Nonce are only useful for async calls, to prevent replay attacks. Other types of
    // calls don't need Nonce so we just skip creating one.
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
