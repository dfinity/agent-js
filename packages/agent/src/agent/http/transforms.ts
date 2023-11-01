import { lebEncode } from '@dfinity/candid';
import * as cbor from 'simple-cbor';
import {
  Endpoint,
  HttpAgentRequest,
  HttpAgentRequestTransformFn,
  HttpHeaderField,
  makeNonce,
  Nonce,
} from './types';

const NANOSECONDS_PER_MILLISECONDS = BigInt(1_000_000);

const REPLICA_PERMITTED_DRIFT_MILLISECONDS = 60 * 1000;

export class Expiry {
  private readonly _value: bigint;

  constructor(deltaInMSec: number) {
    // Use bigint because it can overflow the maximum number allowed in a double float.
    const raw_value =
      BigInt(Math.floor(Date.now() + deltaInMSec - REPLICA_PERMITTED_DRIFT_MILLISECONDS)) *
      NANOSECONDS_PER_MILLISECONDS;

    // round down to the nearest second
    const ingress_as_seconds = raw_value / BigInt(1_000_000_000);

    // round down to nearest minute
    const ingress_as_minutes = ingress_as_seconds / BigInt(60);

    const rounded_down_nanos = ingress_as_minutes * BigInt(60) * BigInt(1_000_000_000);

    this._value = rounded_down_nanos;
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
    const headers = request.request.headers;
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

/**
 * Maps the default fetch headers field to the serializable HttpHeaderField.
 *
 * @param headers Fetch definition of the headers type
 * @returns array of header fields
 */
export function httpHeadersTransform(headers: Headers): HttpHeaderField[] {
  const headerFields: HttpHeaderField[] = [];
  headers.forEach((value, key) => {
    headerFields.push([key, value]);
  });
  return headerFields;
}
