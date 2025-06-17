import { lebEncode } from '@dfinity/candid';
import {
  Endpoint,
  type HttpAgentRequest,
  type HttpAgentRequestTransformFn,
  type HttpHeaderField,
  makeNonce,
  type Nonce,
} from './types';
import { ExpiryJsonDeserializeErrorCode, InputError } from '../../errors';

export const JSON_KEY_EXPIRY = '__expiry__';
const NANOSECONDS_PER_MILLISECOND = BigInt(1_000_000);
const NANOSECONDS_PER_SECOND = NANOSECONDS_PER_MILLISECOND * BigInt(1_000);
const SECONDS_PER_MINUTE = BigInt(60);

const REPLICA_PERMITTED_DRIFT_MILLISECONDS = 60 * 1000;

export type JsonnableExpiry = {
  [JSON_KEY_EXPIRY]: string;
};

export class Expiry {
  public readonly _isExpiry = true;

  private constructor(private readonly __expiry__: bigint) {}

  /**
   * Creates an Expiry object from a delta in milliseconds.
   * If the delta is less than 90 seconds, it is rounded to the nearest second.
   * Otherwise, the delta is rounded down to the nearest minute, with a
   * replica permitted drift subtracted.
   * @param deltaInMs The delta in milliseconds.
   * @returns {Expiry} an Expiry object
   */
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

  public toBigInt(): bigint {
    return this.__expiry__;
  }

  public toHash(): Uint8Array {
    return lebEncode(this.__expiry__);
  }

  public toString(): string {
    return this.__expiry__.toString();
  }

  /**
   * Serializes to JSON
   * @returns {JsonnableExpiry} a JSON object with a single key, {@link JSON_KEY_EXPIRY}, whose value is the expiry as a string
   */
  public toJSON(): JsonnableExpiry {
    return { [JSON_KEY_EXPIRY]: this.toString() };
  }

  /**
   * Deserializes a {@link JsonnableExpiry} object from a JSON string.
   * @param input The JSON string to deserialize.
   * @returns {Expiry} The deserialized Expiry object.
   */
  public static fromJSON(input: string): Expiry {
    const obj = JSON.parse(input);
    if (obj[JSON_KEY_EXPIRY]) {
      try {
        const expiry = BigInt(obj[JSON_KEY_EXPIRY]);
        return new Expiry(expiry);
      } catch (error) {
        throw new InputError(new ExpiryJsonDeserializeErrorCode(`Not a valid BigInt: ${error}`));
      }
    }
    throw new InputError(
      new ExpiryJsonDeserializeErrorCode(`The input does not contain the key ${JSON_KEY_EXPIRY}`),
    );
  }

  public static isExpiry(other: unknown): other is Expiry {
    return (
      other instanceof Expiry ||
      (typeof other === 'object' &&
        other !== null &&
        '_isExpiry' in other &&
        (other as { _isExpiry: boolean })['_isExpiry'] === true &&
        '__expiry__' in other &&
        typeof (other as { __expiry__: bigint })['__expiry__'] === 'bigint')
    );
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
