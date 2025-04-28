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

const NANOSECONDS_PER_MILLISECOND = BigInt(1_000_000);
const NANOSECONDS_PER_SECOND = NANOSECONDS_PER_MILLISECOND * BigInt(1_000);
const SECONDS_PER_MINUTE = BigInt(60);

const REPLICA_PERMITTED_DRIFT_MILLISECONDS = 60 * 1000;

export class Expiry {
  private constructor(private readonly _value: bigint) {}

  public static fromDeltaInMilliseconds(deltaInMs: number): Expiry {
    // if ingress as seconds is less than 90, round to nearest second
    if (deltaInMs < 90 * 1_000) {
      // Raw value without subtraction of REPLICA_PERMITTED_DRIFT_MILLISECONDS
      const raw_value = BigInt(Date.now() + deltaInMs) * NANOSECONDS_PER_MILLISECOND;
      const ingress_as_seconds = raw_value / NANOSECONDS_PER_SECOND;
      return new Expiry(ingress_as_seconds * NANOSECONDS_PER_SECOND);
    }

    // Use bigint because it can overflow the maximum number allowed in a double float.
    const raw_value =
      BigInt(Math.floor(Date.now() + deltaInMs - REPLICA_PERMITTED_DRIFT_MILLISECONDS)) *
      NANOSECONDS_PER_MILLISECOND;

    // round down to the nearest second
    const ingress_as_seconds = raw_value / NANOSECONDS_PER_SECOND;

    // round down to nearest minute
    const ingress_as_minutes = ingress_as_seconds / SECONDS_PER_MINUTE;

    const rounded_down_nanos = ingress_as_minutes * SECONDS_PER_MINUTE * NANOSECONDS_PER_SECOND;

    return new Expiry(rounded_down_nanos);
  }

  public toCBOR(): cbor.CborValue {
    // TODO: change this to take the minimum amount of space (it always takes 8 bytes now).
    return cbor.value.u64(this._value.toString(16), 16);
  }

  public toHash(): ArrayBuffer {
    return lebEncode(this._value);
  }

  public toString(): string {
    return this._value.toString();
  }

  public toJSON(): { _value: string } {
    return { _value: this.toString() };
  }

  public static fromJSON(input: string): Expiry {
    const obj = JSON.parse(input);
    if (obj._value) {
      return new Expiry(BigInt(obj._value));
    }
    throw new Error('Invalid input');
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
 * @param delayInMilliseconds The delay to add to the call time, in milliseconds.
 */
export function makeExpiryTransform(delayInMilliseconds: number): HttpAgentRequestTransformFn {
  return async (request: HttpAgentRequest) => {
    request.body.ingress_expiry = Expiry.fromDeltaInMilliseconds(delayInMilliseconds);
  };
}

/**
 * Maps the default fetch headers field to the serializable HttpHeaderField.
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
