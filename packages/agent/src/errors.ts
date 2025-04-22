import { Principal } from '@dfinity/principal';
import {
  QueryResponseRejected,
  ReplicaRejectCode,
  SubmitResponse,
  v2ResponseBody,
} from './agent/api';
import { RequestId } from './request_id';
import { toHex } from './utils/buffer';
import { RequestStatusResponseStatus } from './agent/http';
import { HttpHeaderField } from './agent/http/types';

enum ErrorKindEnum {
  Trust = 'Trust',
  Protocol = 'Protocol',
  Reject = 'Reject',
  Transport = 'Transport',
  External = 'External',
  Limit = 'Limit',
  Input = 'Input',
  Unknown = 'Unknown',
}

class ErrorCode {
  public toErrorMessage(): string {
    throw new Error('Not implemented');
  }

  public toString(): string {
    return this.toErrorMessage();
  }
}

/**
 * An error that happens in the Agent. This is the root of all errors and should be used
 * everywhere in the Agent code (this package).
 * @todo rename to `AgentError` and remove the old `AgentError`
 */
export class AgentErrorV2 extends Error {
  public name = 'AgentError';

  constructor(
    public readonly code: ErrorCode,
    public readonly kind: ErrorKindEnum,
  ) {
    super(
      code.toErrorMessage(),
      // @ts-expect-error - Error.cause is not supported in the Typescript version that we are using
      {
        cause: {
          code,
          kind,
        },
      },
    );
    Object.setPrototypeOf(this, AgentErrorV2.prototype);
  }

  public hasCode<C extends ErrorCode>(code: new (...args: never[]) => C): boolean {
    return this.code instanceof code;
  }
}

class ErrorKind extends AgentErrorV2 {
  public static fromCode<C extends ErrorCode, E extends ErrorKind>(
    this: new (code: C) => E,
    code: C,
  ): E {
    return new this(code);
  }
}

export class TrustError extends ErrorKind {
  public name = 'TrustError';

  constructor(code: ErrorCode) {
    super(code, ErrorKindEnum.Trust);
    Object.setPrototypeOf(this, TrustError.prototype);
  }
}

export class ProtocolError extends ErrorKind {
  public name = 'ProtocolError';

  constructor(code: ErrorCode) {
    super(code, ErrorKindEnum.Protocol);
    Object.setPrototypeOf(this, ProtocolError.prototype);
  }
}

export class RejectError extends ErrorKind {
  public name = 'RejectError';

  constructor(code: ErrorCode) {
    super(code, ErrorKindEnum.Reject);
    Object.setPrototypeOf(this, RejectError.prototype);
  }
}

export class TransportError extends ErrorKind {
  public name = 'TransportError';

  constructor(code: ErrorCode) {
    super(code, ErrorKindEnum.Transport);
    Object.setPrototypeOf(this, TransportError.prototype);
  }
}

export class ExternalError extends ErrorKind {
  public name = 'ExternalError';

  constructor(code: ErrorCode) {
    super(code, ErrorKindEnum.External);
    Object.setPrototypeOf(this, ExternalError.prototype);
  }
}

export class LimitError extends ErrorKind {
  public name = 'LimitError';

  constructor(code: ErrorCode) {
    super(code, ErrorKindEnum.Limit);
    Object.setPrototypeOf(this, LimitError.prototype);
  }
}

export class InputError extends ErrorKind {
  public name = 'InputError';

  constructor(code: ErrorCode) {
    super(code, ErrorKindEnum.Input);
    Object.setPrototypeOf(this, InputError.prototype);
  }
}

export class UnknownError extends ErrorKind {
  public name = 'UnknownError';

  constructor(code: ErrorCode) {
    super(code, ErrorKindEnum.Unknown);
    Object.setPrototypeOf(this, UnknownError.prototype);
  }
}

export class CertificateVerificationErrorCode extends ErrorCode {
  public name = 'CertificateVerificationErrorCode';

  constructor(public readonly reason: string) {
    super();
    Object.setPrototypeOf(this, CertificateVerificationErrorCode.prototype);
  }

  public toErrorMessage(): string {
    return `Certificate verification error: "${this.reason}"`;
  }
}

export class CertificateTimeErrorCode extends ErrorCode {
  public name = 'CertificateTimeErrorCode';

  constructor(
    public readonly maxAgeInMinutes: number,
    public readonly certificateTime: Date,
    public readonly currentTime: Date,
    public readonly ageType: 'past' | 'future',
  ) {
    super();
    Object.setPrototypeOf(this, CertificateTimeErrorCode.prototype);
  }

  public toErrorMessage(): string {
    return `Certificate is signed more than ${this.maxAgeInMinutes} minutes in the ${this.ageType}. Certificate time: ${this.certificateTime.toISOString()} Current time: ${this.currentTime.toISOString()}`;
  }
}

export class CertificateHasTooManyDelegationsErrorCode extends ErrorCode {
  public name = 'CertificateHasTooManyDelegationsErrorCode';

  constructor() {
    super();
    Object.setPrototypeOf(this, CertificateHasTooManyDelegationsErrorCode.prototype);
  }

  public toErrorMessage(): string {
    return 'Certificate has too many delegations';
  }
}

export class CertificateNotAuthorizedErrorCode extends ErrorCode {
  public name = 'CertificateNotAuthorizedErrorCode';

  constructor(
    public readonly canisterId: Principal,
    public readonly subnetId: ArrayBuffer,
  ) {
    super();
    Object.setPrototypeOf(this, CertificateNotAuthorizedErrorCode.prototype);
  }

  public toErrorMessage(): string {
    return `The certificate contains a delegation that does not include the canister ${this.canisterId.toText()} in the canister_ranges field. Subnet ID: 0x${toHex(this.subnetId)}`;
  }
}

export class LookupErrorCode extends ErrorCode {
  public name = 'LookupErrorCode';

  constructor(public readonly message: string) {
    super();
    Object.setPrototypeOf(this, LookupErrorCode.prototype);
  }

  public toErrorMessage(): string {
    return this.message;
  }
}

export class DerKeyLengthMismatchErrorCode extends ErrorCode {
  public name = 'DerKeyLengthMismatchErrorCode';

  constructor(
    public readonly expectedLength: number,
    public readonly actualLength: number,
  ) {
    super();
    Object.setPrototypeOf(this, DerKeyLengthMismatchErrorCode.prototype);
  }

  public toErrorMessage(): string {
    return `BLS DER-encoded public key must be ${this.expectedLength} bytes long, but is ${this.actualLength} bytes long`;
  }
}

export class DerPrefixMismatchErrorCode extends ErrorCode {
  public name = 'DerPrefixMismatchErrorCode';

  constructor(
    public readonly expectedPrefix: ArrayBuffer,
    public readonly actualPrefix: ArrayBuffer,
  ) {
    super();
    Object.setPrototypeOf(this, DerPrefixMismatchErrorCode.prototype);
  }

  public toErrorMessage(): string {
    return `BLS DER-encoded public key is invalid. Expected the following prefix: ${this.expectedPrefix}, but got ${this.actualPrefix}`;
  }
}

export class DerDecodeLengthMismatchErrorCode extends ErrorCode {
  public name = 'DerDecodeLengthMismatchErrorCode';

  constructor(
    public readonly expectedLength: number,
    public readonly actualLength: number,
  ) {
    super();
    Object.setPrototypeOf(this, DerDecodeLengthMismatchErrorCode.prototype);
  }

  public toErrorMessage(): string {
    return `DER payload mismatch: Expected length ${this.expectedLength}, actual length: ${this.actualLength}`;
  }
}

export class DerDecodeErrorCode extends ErrorCode {
  public name = 'DerDecodeErrorCode';

  constructor(public readonly error: string) {
    super();
    Object.setPrototypeOf(this, DerDecodeErrorCode.prototype);
  }

  public toErrorMessage(): string {
    return `Failed to decode DER: ${this.error}`;
  }
}

export class DerEncodeErrorCode extends ErrorCode {
  public name = 'DerEncodeErrorCode';

  constructor(public readonly error: string) {
    super();
    Object.setPrototypeOf(this, DerEncodeErrorCode.prototype);
  }

  public toErrorMessage(): string {
    return `Failed to encode DER: ${this.error}`;
  }
}

export class CborDecodeErrorCode extends ErrorCode {
  public name = 'CborDecodeErrorCode';

  constructor(
    public readonly error: unknown,
    public readonly input: Uint8Array,
  ) {
    super();
    Object.setPrototypeOf(this, CborDecodeErrorCode.prototype);
  }

  public toErrorMessage(): string {
    return `Failed to decode CBOR: ${this.error}, input: ${toHex(this.input)}`;
  }
}

export class HexDecodeErrorCode extends ErrorCode {
  public name = 'HexDecodeErrorCode';

  constructor(public readonly error: string) {
    super();
    Object.setPrototypeOf(this, HexDecodeErrorCode.prototype);
  }

  public toErrorMessage(): string {
    return `Failed to decode hex: ${this.error}`;
  }
}

export class TimeoutWaitingForResponseErrorCode extends ErrorCode {
  public name = 'TimeoutWaitingForResponseErrorCode';

  constructor(
    public readonly message: string,
    public readonly requestId: RequestId | undefined = undefined,
    public readonly status: RequestStatusResponseStatus | undefined = undefined,
  ) {
    super();
    Object.setPrototypeOf(this, TimeoutWaitingForResponseErrorCode.prototype);
  }

  public toErrorMessage(): string {
    let errorMessage = `${this.message}\n`;
    if (this.requestId) {
      errorMessage += `  Request ID: ${toHex(this.requestId)}\n`;
    }
    if (this.status) {
      errorMessage += `  Request status: ${this.status}\n`;
    }
    return errorMessage;
  }
}

export class CertifiedRejectErrorCode extends ErrorCode {
  public name = 'CertifiedRejectErrorCode';

  constructor(
    public readonly requestId: RequestId,
    public readonly rejectCode: number,
    public readonly rejectMessage: string,
  ) {
    super();
    Object.setPrototypeOf(this, CertifiedRejectErrorCode.prototype);
  }

  public toErrorMessage(): string {
    return (
      `Call was rejected:\n` +
      `  Request ID: ${toHex(this.requestId)}\n` +
      `  Reject code: ${this.rejectCode}\n` +
      `  Reject text: ${this.rejectMessage}\n`
    );
  }
}

export class RequestStatusDoneNoReplyErrorCode extends ErrorCode {
  public name = 'RequestStatusDoneNoReplyErrorCode';

  constructor(public readonly requestId: RequestId) {
    super();
    Object.setPrototypeOf(this, RequestStatusDoneNoReplyErrorCode.prototype);
  }

  public toErrorMessage(): string {
    return (
      `Call was marked as done but we never saw the reply:\n` +
      `  Request ID: ${toHex(this.requestId)}\n`
    );
  }
}

export class MissingRootKeyErrorCode extends ErrorCode {
  public name = 'MissingRootKeyErrorCode';

  constructor(public readonly shouldFetchRootKey: boolean | undefined = undefined) {
    super();
    Object.setPrototypeOf(this, MissingRootKeyErrorCode.prototype);
  }

  public toErrorMessage(): string {
    if (this.shouldFetchRootKey === undefined) {
      return 'Agent is missing root key';
    }
    return `Agent is missing root key and the shouldFetchRootKey value is set to ${this.shouldFetchRootKey}. The root key should only be unknown if you are in local development. Otherwise you should avoid fetching and use the default IC Root Key or the known root key of your environment.`;
  }
}

export class HashValueErrorCode extends ErrorCode {
  public name = 'HashValueErrorCode';

  constructor(public readonly value: unknown) {
    super();
    Object.setPrototypeOf(this, HashValueErrorCode.prototype);
  }

  public toErrorMessage(): string {
    return `Attempt to hash a value of unsupported type: ${this.value}`;
  }
}

export class HttpDefaultFetchErrorCode extends ErrorCode {
  public name = 'HttpDefaultFetchErrorCode';

  constructor(public readonly error: string) {
    super();
    Object.setPrototypeOf(this, HttpDefaultFetchErrorCode.prototype);
  }

  public toErrorMessage(): string {
    return this.error;
  }
}

export class IdentityInvalidErrorCode extends ErrorCode {
  public name = 'IdentityInvalidErrorCode';

  constructor() {
    super();
    Object.setPrototypeOf(this, IdentityInvalidErrorCode.prototype);
  }

  public toErrorMessage(): string {
    return "This identity has expired due this application's security policy. Please refresh your authentication.";
  }
}

export class IngressExpiryInvalidErrorCode extends ErrorCode {
  public name = 'IngressExpiryInvalidErrorCode';

  constructor(
    public readonly message: string,
    public readonly providedIngressExpiryInMinutes: number,
  ) {
    super();
    Object.setPrototypeOf(this, IngressExpiryInvalidErrorCode.prototype);
  }

  public toErrorMessage(): string {
    return `${this.message}. Provided ingress expiry time is ${this.providedIngressExpiryInMinutes} minutes.`;
  }
}

export class CreateHttpAgentErrorCode extends ErrorCode {
  public name = 'CreateHttpAgentErrorCode';

  constructor() {
    super();
    Object.setPrototypeOf(this, CreateHttpAgentErrorCode.prototype);
  }

  public toErrorMessage(): string {
    return 'Failed to create agent from provided agent';
  }
}

export class MalformedSignatureErrorCode extends ErrorCode {
  public name = 'MalformedSignatureErrorCode';

  constructor(public readonly error: string) {
    super();
    Object.setPrototypeOf(this, MalformedSignatureErrorCode.prototype);
  }

  public toErrorMessage(): string {
    return `Query response contained a malformed signature: ${this.error}`;
  }
}

export class MissingSignatureErrorCode extends ErrorCode {
  public name = 'MissingSignatureErrorCode';

  constructor() {
    super();
    Object.setPrototypeOf(this, MissingSignatureErrorCode.prototype);
  }

  public toErrorMessage(): string {
    return 'Query response did not contain any node signatures';
  }
}

export class MalformedPublicKeyErrorCode extends ErrorCode {
  public name = 'MalformedPublicKeyErrorCode';

  constructor() {
    super();
    Object.setPrototypeOf(this, MalformedPublicKeyErrorCode.prototype);
  }

  public toErrorMessage(): string {
    return 'Read state response contained a malformed public key';
  }
}

export class QuerySignatureVerificationFailedErrorCode extends ErrorCode {
  public name = 'QuerySignatureVerificationFailedErrorCode';

  constructor(public readonly nodeId: string) {
    super();
    Object.setPrototypeOf(this, QuerySignatureVerificationFailedErrorCode.prototype);
  }

  public toErrorMessage(): string {
    return `Query signature verification failed. Node ID: ${this.nodeId}`;
  }
}

export class UnexpectedErrorCode extends ErrorCode {
  public name = 'UnexpectedErrorCode';

  constructor(public readonly error: string) {
    super();
    Object.setPrototypeOf(this, UnexpectedErrorCode.prototype);
  }

  public toErrorMessage(): string {
    return `Unexpected error: ${this.error}`;
  }
}

export class HashTreeDecodeErrorCode extends ErrorCode {
  public name = 'HashTreeDecodeErrorCode';

  constructor(public readonly error: string) {
    super();
    Object.setPrototypeOf(this, HashTreeDecodeErrorCode.prototype);
  }

  public toErrorMessage(): string {
    return `Failed to decode certificate: ${this.error}`;
  }
}

export class HttpErrorCode extends ErrorCode {
  public name = 'HttpErrorCode';

  constructor(
    public readonly status: number,
    public readonly statusText: string,
    public readonly headers: HttpHeaderField[],
    public readonly bodyText: string | undefined = undefined,
  ) {
    super();
    Object.setPrototypeOf(this, HttpErrorCode.prototype);
  }

  public toErrorMessage(): string {
    let errorMessage =
      'HTTP request failed:\n' +
      `  Status: ${this.status} (${this.statusText})\n` +
      `  Headers: ${JSON.stringify(this.headers)}\n`;
    if (this.bodyText) {
      errorMessage += `  Body: ${this.bodyText}\n`;
    }
    return errorMessage;
  }
}

export class HttpV3ApiNotSupportedErrorCode extends ErrorCode {
  public name = 'HttpV3ApiNotSupportedErrorCode';

  constructor() {
    super();
    Object.setPrototypeOf(this, HttpV3ApiNotSupportedErrorCode.prototype);
  }

  public toErrorMessage(): string {
    return 'HTTP request failed: v3 API is not supported';
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
