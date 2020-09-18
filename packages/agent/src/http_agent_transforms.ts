import BigNumber from 'bignumber.js';
import { Buffer } from 'buffer/';
import * as cbor from 'simple-cbor';
import { Endpoint, HttpAgentRequest, HttpAgentRequestTransformFn } from './http_agent_types';
import { makeNonce, Nonce } from './types';
import { lebEncode } from './utils/leb128';

const NANOSECONDS_PER_MILLISECONDS = 1000000;

const REPLICA_PERMITTED_DRIFT_MILLISECONDS = 60 * 1000;

export class Expiry {
  private readonly _value: BigNumber;

  constructor(deltaInMSec: number) {
    // Use BigNumber because it can overflow the maximum number allowed in a double float.
    this._value = new BigNumber(Date.now().valueOf())
      .plus(deltaInMSec)
      .minus(REPLICA_PERMITTED_DRIFT_MILLISECONDS)
      .times(NANOSECONDS_PER_MILLISECONDS);
  }

  public toCBOR(): cbor.CborValue {
    // TODO: change this to take the minimum amount of space (it always takes 8 bytes now).
    return cbor.value.u64(this._value.toString(16), 16);
  }

  public toHash(): Buffer {
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
    if (request.endpoint !== Endpoint.Read) {
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
