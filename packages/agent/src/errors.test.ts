/* eslint-disable no-prototype-builtins */
import { Principal } from '@dfinity/principal';
import {
  AgentError,
  ErrorKindEnum,
  UnexpectedErrorCode,
  IdentityInvalidErrorCode,
  UnknownError,
  UncertifiedRejectErrorCode,
  CertifiedRejectErrorCode,
} from './errors.ts';
import { Expiry, ReplicaRejectCode } from './agent/index.ts';
import { RequestId } from './request_id.ts';

test('AgentError', () => {
  const errorCode = new UnexpectedErrorCode('message');
  const agentError = new AgentError(errorCode, ErrorKindEnum.Unknown);
  const expectedErrorMessage = 'Unexpected error: message';

  expect(agentError.name).toEqual('AgentError');
  expect(agentError.message).toEqual(expectedErrorMessage);
  expect(agentError.code).toBeInstanceOf(UnexpectedErrorCode);
  expect(agentError.kind).toBe(ErrorKindEnum.Unknown);
  expect(agentError.cause.code).toBeInstanceOf(UnexpectedErrorCode);
  expect(agentError.cause.kind).toBe(ErrorKindEnum.Unknown);
  expect(agentError.toString()).toEqual('AgentError (Unknown): Unexpected error: message');

  const unknownError = UnknownError.fromCode(errorCode);
  expect(unknownError.name).toEqual('UnknownError');
  expect(unknownError.message).toEqual(expectedErrorMessage);
  expect(unknownError.code).toBeInstanceOf(UnexpectedErrorCode);
  expect(unknownError.kind).toBe(ErrorKindEnum.Unknown);
  expect(unknownError.cause.code).toBeInstanceOf(UnexpectedErrorCode);
  expect(unknownError.cause.kind).toBe(ErrorKindEnum.Unknown);
  expect(unknownError.toString()).toEqual('UnknownError (Unknown): Unexpected error: message');

  expect(agentError instanceof Error).toEqual(true);
  expect(agentError instanceof AgentError).toEqual(true);
  expect(agentError instanceof UnknownError).toEqual(false);
  expect(unknownError instanceof Error).toEqual(true);
  expect(unknownError instanceof AgentError).toEqual(true);
  expect(unknownError instanceof UnknownError).toEqual(true);
  expect(AgentError.prototype.isPrototypeOf(agentError)).toEqual(true);
  expect(AgentError.prototype.isPrototypeOf(unknownError)).toEqual(true);
  expect(UnknownError.prototype.isPrototypeOf(agentError)).toEqual(false);
  expect(UnknownError.prototype.isPrototypeOf(unknownError)).toEqual(true);

  expect(agentError.hasCode(UnexpectedErrorCode)).toEqual(true);
  // another error code to test that hasCode works
  expect(agentError.hasCode(IdentityInvalidErrorCode)).toEqual(false);

  expect(errorCode.toErrorMessage()).toEqual(expectedErrorMessage);
  expect(errorCode.toString()).toEqual(expectedErrorMessage);
  expect(errorCode.requestContext).toBeUndefined();
  expect(errorCode.toString().includes('\nRequest context:')).toBe(false);
  expect(errorCode.callContext).toBeUndefined();
  expect(errorCode.toString().includes('\nCall context:')).toBe(false);
  errorCode.requestContext = {
    requestId: undefined,
    senderPubKey: new Uint8Array(1),
    senderSignature: new Uint8Array(1),
    ingressExpiry: Expiry.fromDeltaInMilliseconds(1),
  };
  expect(errorCode.requestContext).toBeDefined();
  expect(errorCode.toString().includes('\nRequest context:')).toBe(true);
  errorCode.callContext = {
    canisterId: Principal.anonymous(),
    methodName: 'test',
    httpDetails: {
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: [],
    },
  };
  expect(errorCode.callContext).toBeDefined();
  expect(errorCode.toString().includes('\nCall context:')).toBe(true);

  const anotherErrorCode = new IdentityInvalidErrorCode();
  agentError.code = anotherErrorCode;
  expect(agentError.code).toBe(anotherErrorCode);
  expect(agentError.cause.code).toBe(anotherErrorCode);
  unknownError.code = anotherErrorCode;
  expect(unknownError.code).toBe(anotherErrorCode);
  expect(unknownError.cause.code).toBe(anotherErrorCode);

  const anotherKind = ErrorKindEnum.External;
  agentError.kind = anotherKind;
  expect(agentError.kind).toBe(anotherKind);
  expect(agentError.cause.kind).toBe(anotherKind);
  unknownError.kind = anotherKind;
  expect(unknownError.kind).toBe(anotherKind);
  expect(unknownError.cause.kind).toBe(anotherKind);
});

test('Error code certification', () => {
  const requestId = new Uint8Array(16) as RequestId;
  const rejectCode = ReplicaRejectCode.CanisterReject;
  const rejectMessage = 'message';
  const rejectErrorCode = '42';

  const uncertifiedRejectErrorCode = new UncertifiedRejectErrorCode(
    requestId,
    rejectCode,
    rejectMessage,
    rejectErrorCode,
    [],
  );
  const agentError = new AgentError(uncertifiedRejectErrorCode, ErrorKindEnum.Trust);
  expect(uncertifiedRejectErrorCode.isCertified).toBe(false);
  expect(agentError.isCertified).toBe(false);

  const certifiedRejectErrorCode = new CertifiedRejectErrorCode(
    requestId,
    rejectCode,
    rejectMessage,
    rejectErrorCode,
  );
  agentError.code = certifiedRejectErrorCode;
  expect(certifiedRejectErrorCode.isCertified).toBe(true);
  expect(agentError.isCertified).toBe(true);
});
