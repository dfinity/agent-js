import { Principal } from '@dfinity/principal';
import {
  QueryResponseRejected,
  ReplicaRejectCode,
  SubmitResponse,
  v2ResponseBody,
} from './agent/api';
import { RequestId } from './request_id';
import { toHex } from './utils/buffer';

export enum ErrorKind {
  Trust = 'Trust',
  Protocol = 'Protocol',
  Reject = 'Reject',
  Transport = 'Transport',
  External = 'External',
  Limit = 'Limit',
  Input = 'Input',
  Unknown = 'Unknown',
}

abstract class ErrorCode {
  public abstract toString(): string;
}

/**
 * An error that happens in the Agent. This is the root of all errors and should be used
 * everywhere in the Agent code (this package).
 * @todo rename to `AgentError` and remove the old `AgentError`
 */
export class AgentErrorV2 extends Error {
  public name = 'AgentError';

  constructor(code: ErrorCode, kind: ErrorKind) {
    // @ts-expect-error - Error.cause is not supported in the Typescript version that we are using
    super(code.toString(), { cause: { code, kind } });
    Object.setPrototypeOf(this, AgentErrorV2.prototype);
  }
}

class CertificateVerificationErrorCode implements ErrorCode {
  constructor(public readonly reason: string) {
    Object.setPrototypeOf(this, CertificateVerificationErrorCode.prototype);
  }

  public toString(): string {
    return `Certificate verification error: "${this.reason}"`;
  }
}

/**
 * A certificate may fail verification with respect to the provided public key
 */
export class CertificateVerificationError extends AgentErrorV2 {
  public name = 'CertificateVerificationError';

  constructor(reason: string, kind: ErrorKind) {
    super(new CertificateVerificationErrorCode(reason), kind);
    Object.setPrototypeOf(this, CertificateVerificationError.prototype);
  }
}

class CertificateTimeErrorCode implements ErrorCode {
  constructor(
    public readonly maxAgeInMinutes: number,
    public readonly certificateTime: Date,
    public readonly currentTime: Date,
    public readonly ageType: 'past' | 'future',
  ) {
    Object.setPrototypeOf(this, CertificateTimeErrorCode.prototype);
  }

  public toString(): string {
    return `Certificate is signed more than ${this.maxAgeInMinutes} minutes in the ${this.ageType}. Certificate time: ${this.certificateTime.toISOString()} Current time: ${this.currentTime.toISOString()}`;
  }
}

export class CertificateTimeError extends AgentErrorV2 {
  public name = 'CertificateTimeError';

  constructor(
    options: {
      maxAgeInMinutes: number;
      certificateTime: Date;
      currentTime: Date;
      ageType: 'past' | 'future';
    },
    kind: ErrorKind,
  ) {
    super(
      new CertificateTimeErrorCode(
        options.maxAgeInMinutes,
        options.certificateTime,
        options.currentTime,
        options.ageType,
      ),
      kind,
    );
    Object.setPrototypeOf(this, CertificateTimeError.prototype);
  }
}

class CertificateHasTooManyDelegationsErrorCode implements ErrorCode {
  constructor() {
    Object.setPrototypeOf(this, CertificateHasTooManyDelegationsErrorCode.prototype);
  }

  public toString(): string {
    return 'Certificate has too many delegations';
  }
}

export class CertificateHasTooManyDelegationsError extends AgentErrorV2 {
  public name = 'CertificateHasTooManyDelegationsError';

  constructor(kind: ErrorKind) {
    super(new CertificateHasTooManyDelegationsErrorCode(), kind);
    Object.setPrototypeOf(this, CertificateHasTooManyDelegationsError.prototype);
  }
}

class CertificateNotAuthorizedErrorCode implements ErrorCode {
  constructor(
    public readonly canisterId: Principal,
    public readonly subnetId: ArrayBuffer,
  ) {
    Object.setPrototypeOf(this, CertificateNotAuthorizedErrorCode.prototype);
  }

  public toString(): string {
    return `The certificate contains a delegation that does not include the canister ${this.canisterId.toText()} in the canister_ranges field. Subnet ID: 0x${toHex(this.subnetId)}`;
  }
}

export class CertificateNotAuthorizedError extends AgentErrorV2 {
  public name = 'CertificateNotAuthorizedError';

  constructor(
    options: {
      canisterId: Principal;
      subnetId: ArrayBuffer;
    },
    kind: ErrorKind,
  ) {
    super(new CertificateNotAuthorizedErrorCode(options.canisterId, options.subnetId), kind);
    Object.setPrototypeOf(this, CertificateNotAuthorizedError.prototype);
  }
}

class LookupErrorCode implements ErrorCode {
  constructor(public readonly message: string) {
    Object.setPrototypeOf(this, LookupErrorCode.prototype);
  }

  public toString(): string {
    return this.message;
  }
}

export class LookupError extends AgentErrorV2 {
  public name = 'LookupError';

  constructor(message: string, kind: ErrorKind) {
    super(new LookupErrorCode(message), kind);
    Object.setPrototypeOf(this, LookupError.prototype);
  }
}

class DerKeyLengthMismatchErrorCode implements ErrorCode {
  constructor(
    public readonly expectedLength: number,
    public readonly actualLength: number,
  ) {
    Object.setPrototypeOf(this, DerKeyLengthMismatchErrorCode.prototype);
  }

  public toString(): string {
    return `BLS DER-encoded public key must be ${this.expectedLength} bytes long, but is ${this.actualLength} bytes long`;
  }
}

export class DerKeyLengthMismatchError extends AgentErrorV2 {
  public name = 'DerKeyLengthMismatchError';

  constructor(
    options: {
      expectedLength: number;
      actualLength: number;
    },
    kind: ErrorKind,
  ) {
    super(new DerKeyLengthMismatchErrorCode(options.expectedLength, options.actualLength), kind);
    Object.setPrototypeOf(this, DerKeyLengthMismatchError.prototype);
  }
}

class DerPrefixMismatchErrorCode implements ErrorCode {
  constructor(
    public readonly expectedPrefix: ArrayBuffer,
    public readonly actualPrefix: ArrayBuffer,
  ) {
    Object.setPrototypeOf(this, DerPrefixMismatchErrorCode.prototype);
  }

  public toString(): string {
    return `BLS DER-encoded public key is invalid. Expected the following prefix: ${this.expectedPrefix}, but got ${this.actualPrefix}`;
  }
}

export class DerPrefixMismatchError extends AgentErrorV2 {
  public name = 'DerPrefixMismatchError';

  constructor(
    options: { expectedPrefix: ArrayBuffer; actualPrefix: ArrayBuffer },
    kind: ErrorKind,
  ) {
    super(new DerPrefixMismatchErrorCode(options.expectedPrefix, options.actualPrefix), kind);
    Object.setPrototypeOf(this, DerPrefixMismatchError.prototype);
  }
}

class CborDecodeErrorCode implements ErrorCode {
  constructor(
    public readonly error: unknown,
    public readonly input: Uint8Array,
  ) {
    Object.setPrototypeOf(this, CborDecodeErrorCode.prototype);
  }

  public toString(): string {
    return `Failed to decode CBOR: ${this.error}, input: ${toHex(this.input)}`;
  }
}

export class CborDecodeError extends AgentErrorV2 {
  public name = 'CborDecodeError';

  constructor(options: { error: unknown; input: Uint8Array }, kind: ErrorKind) {
    super(new CborDecodeErrorCode(options.error, options.input), kind);
    Object.setPrototypeOf(this, CborDecodeError.prototype);
  }
}

/**
 * An error that happens in the Agent. This is the root of all errors and should be used
 * everywhere in the Agent code (this package).
 * @todo https://github.com/dfinity/agent-js/issues/420
 */
export class AgentError extends Error {
  public name = 'AgentError';
  public __proto__ = AgentError.prototype;
  constructor(public readonly message: string) {
    super(message);
    Object.setPrototypeOf(this, AgentError.prototype);
  }
}

export class ActorCallError extends AgentError {
  public name = 'ActorCallError';
  public __proto__ = ActorCallError.prototype;
  constructor(
    public readonly canisterId: Principal | string,
    public readonly methodName: string,
    public readonly type: 'query' | 'update',
    public readonly props: Record<string, string>,
  ) {
    const cid = Principal.from(canisterId);
    super(
      [
        `Call failed:`,
        `  Canister: ${cid.toText()}`,
        `  Method: ${methodName} (${type})`,
        ...Object.getOwnPropertyNames(props).map(n => `  "${n}": ${JSON.stringify(props[n])}`),
      ].join('\n'),
    );
    Object.setPrototypeOf(this, ActorCallError.prototype);
  }
}

export class QueryCallRejectedError extends ActorCallError {
  public name = 'QueryCallRejectedError';
  public __proto__ = QueryCallRejectedError.prototype;
  constructor(
    canisterId: Principal | string,
    methodName: string,
    public readonly result: QueryResponseRejected,
  ) {
    const cid = Principal.from(canisterId);
    super(cid, methodName, 'query', {
      Status: result.status,
      Code: ReplicaRejectCode[result.reject_code] ?? `Unknown Code "${result.reject_code}"`,
      Message: result.reject_message,
    });
    Object.setPrototypeOf(this, QueryCallRejectedError.prototype);
  }
}

export class UpdateCallRejectedError extends ActorCallError {
  public name = 'UpdateCallRejectedError';
  public __proto__ = UpdateCallRejectedError.prototype;
  constructor(
    canisterId: Principal | string,
    methodName: string,
    public readonly requestId: RequestId,
    public readonly response: SubmitResponse['response'],
  ) {
    const cid = Principal.from(canisterId);
    super(cid, methodName, 'update', {
      'Request ID': toHex(requestId),
      ...(response.body
        ? {
            ...((response.body as v2ResponseBody).error_code
              ? {
                  'Error code': (response.body as v2ResponseBody).error_code,
                }
              : {}),
            'Reject code': String((response.body as v2ResponseBody).reject_code),
            'Reject message': (response.body as v2ResponseBody).reject_message,
          }
        : {
            'HTTP status code': response.status.toString(),
            'HTTP status text': response.statusText,
          }),
    });
    Object.setPrototypeOf(this, UpdateCallRejectedError.prototype);
  }
}
