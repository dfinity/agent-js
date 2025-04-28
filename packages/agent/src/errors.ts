import { Principal } from '@dfinity/principal';
import { HttpDetailsResponse, ReplicaRejectCode } from './agent/api';
import { RequestId } from './request_id';
import { toHex } from './utils/buffer';
import { Expiry, RequestStatusResponseStatus } from './agent/http';
import { HttpHeaderField } from './agent/http/types';

export enum ErrorKindEnum {
  Trust = 'Trust',
  Protocol = 'Protocol',
  Reject = 'Reject',
  Transport = 'Transport',
  External = 'External',
  Limit = 'Limit',
  Input = 'Input',
  Unknown = 'Unknown',
}

export type RequestContext = {
  requestId?: RequestId;
  senderPubKey: ArrayBuffer;
  senderSignature: ArrayBuffer;
  ingressExpiry: Expiry;
};

export type CallContext = {
  canisterId: Principal;
  methodName: string;
  httpDetails: HttpDetailsResponse;
};

abstract class ErrorCode {
  public requestContext?: RequestContext;
  public callContext?: CallContext;

  public abstract toErrorMessage(): string;

  public toString(): string {
    let errorMessage = this.toErrorMessage();
    if (this.requestContext) {
      errorMessage +=
        `\nRequest context:\n` +
        `  Request ID (hex): ${this.requestContext.requestId ? toHex(this.requestContext.requestId) : 'undefined'}\n` +
        `  Sender pubkey (hex): ${toHex(this.requestContext.senderPubKey)}\n` +
        `  Sender signature (hex): ${toHex(this.requestContext.senderSignature)}\n` +
        `  Ingress expiry: ${this.requestContext.ingressExpiry.toString()}`;
    }
    if (this.callContext) {
      errorMessage +=
        `\nCall context:\n` +
        `  Canister ID: ${this.callContext.canisterId.toText()}\n` +
        `  Method name: ${this.callContext.methodName}\n` +
        `  HTTP details: ${JSON.stringify(this.callContext.httpDetails, null, 2)}`;
    }
    return errorMessage;
  }
}

/**
 * An error that happens in the Agent. This is the root of all errors and should be used
 * everywhere in the Agent code (this package).
 */
export class AgentError extends Error {
  public name = 'AgentError';
  // override the Error.cause property
  public readonly cause: { code: ErrorCode; kind: ErrorKindEnum };

  get code(): ErrorCode {
    return this.cause.code;
  }
  set code(code: ErrorCode) {
    this.cause.code = code;
  }

  get kind(): ErrorKindEnum {
    return this.cause.kind;
  }
  set kind(kind: ErrorKindEnum) {
    this.cause.kind = kind;
  }

  constructor(code: ErrorCode, kind: ErrorKindEnum) {
    super(code.toString());
    this.cause = { code, kind };
    Object.setPrototypeOf(this, AgentError.prototype);
  }

  public hasCode<C extends ErrorCode>(code: new (...args: never[]) => C): boolean {
    return this.code instanceof code;
  }

  public toString(): string {
    return `${this.name} (${this.kind}): ${this.message}`;
  }
}

class ErrorKind extends AgentError {
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
    public readonly requestId?: RequestId,
    public readonly status?: RequestStatusResponseStatus,
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
    public readonly rejectCode: ReplicaRejectCode,
    public readonly rejectMessage: string,
    public readonly errorCode: string | undefined,
  ) {
    super();
    Object.setPrototypeOf(this, CertifiedRejectErrorCode.prototype);
  }

  public toErrorMessage(): string {
    return (
      `The replica returned a rejection error:\n` +
      `  Request ID: ${toHex(this.requestId)}\n` +
      `  Reject code: ${this.rejectCode}\n` +
      `  Reject text: ${this.rejectMessage}\n` +
      `  Error code: ${this.errorCode}\n`
    );
  }
}

export class UncertifiedRejectErrorCode extends ErrorCode {
  public name = 'UncertifiedRejectErrorCode';

  constructor(
    public readonly requestId: RequestId,
    public readonly rejectCode: ReplicaRejectCode,
    public readonly rejectMessage: string,
    public readonly errorCode: string | undefined,
  ) {
    super();
    Object.setPrototypeOf(this, UncertifiedRejectErrorCode.prototype);
  }

  public toErrorMessage(): string {
    return (
      `The replica returned a rejection error:\n` +
      `  Request ID: ${toHex(this.requestId)}\n` +
      `  Reject code: ${this.rejectCode}\n` +
      `  Reject text: ${this.rejectMessage}\n` +
      `  Error code: ${this.errorCode}\n`
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

  constructor(public readonly shouldFetchRootKey?: boolean) {
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

  constructor(public readonly error: unknown) {
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
    public readonly bodyText?: string,
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

export class HttpFetchErrorCode extends ErrorCode {
  public name = 'HttpFetchErrorCode';

  constructor(public readonly error: unknown) {
    super();
    Object.setPrototypeOf(this, HttpFetchErrorCode.prototype);
  }

  public toErrorMessage(): string {
    return `Failed to fetch HTTP request: ${this.error}`;
  }
}

export class MissingCanisterIdErrorCode extends ErrorCode {
  public name = 'MissingCanisterIdErrorCode';

  constructor(public readonly receivedCanisterId: unknown) {
    super();
    Object.setPrototypeOf(this, MissingCanisterIdErrorCode.prototype);
  }

  public toErrorMessage(): string {
    return `Canister ID is required, but received ${typeof this.receivedCanisterId} instead. If you are using automatically generated declarations, this may be because your application is not setting the canister ID in process.env correctly.`;
  }
}

export class InvalidReadStateRequestErrorCode extends ErrorCode {
  public name = 'InvalidReadStateRequestErrorCode';

  constructor(public readonly request: unknown) {
    super();
    Object.setPrototypeOf(this, InvalidReadStateRequestErrorCode.prototype);
  }

  public toErrorMessage(): string {
    return `Invalid read state request: ${this.request}`;
  }
}

export class ExpiryJsonDeserializeErrorCode extends ErrorCode {
  public name = 'ExpiryJsonDeserializeErrorCode';

  constructor(public readonly error: string) {
    super();
    Object.setPrototypeOf(this, ExpiryJsonDeserializeErrorCode.prototype);
  }

  public toErrorMessage(): string {
    return `Failed to deserialize expiry: ${this.error}`;
  }
}

/**
 * Special error used to indicate that a code path is unreachable.
 *
 * For internal use only.
 */
export const UNREACHABLE_ERROR = new Error('unreachable');
