/* eslint-disable no-prototype-builtins */
import {
  AgentError,
  ErrorKindEnum,
  UnexpectedErrorCode,
  IdentityInvalidErrorCode,
  UnknownError,
} from './errors';

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

  const error = UnknownError.fromCode(errorCode);
  expect(error.name).toEqual('UnknownError');
  expect(error.message).toEqual(expectedErrorMessage);
  expect(error.code).toBeInstanceOf(UnexpectedErrorCode);
  expect(error.kind).toBe(ErrorKindEnum.Unknown);
  expect(error.cause.code).toBeInstanceOf(UnexpectedErrorCode);
  expect(error.cause.kind).toBe(ErrorKindEnum.Unknown);
  expect(error.toString()).toEqual('UnknownError (Unknown): Unexpected error: message');

  expect(agentError instanceof Error).toEqual(true);
  expect(agentError instanceof AgentError).toEqual(true);
  expect(error instanceof Error).toEqual(true);
  expect(error instanceof AgentError).toEqual(true);
  expect(AgentError.prototype.isPrototypeOf(agentError)).toEqual(true);
  expect(AgentError.prototype.isPrototypeOf(error)).toEqual(true);
  expect(UnknownError.prototype.isPrototypeOf(agentError)).toEqual(false);
  expect(UnknownError.prototype.isPrototypeOf(error)).toEqual(true);

  expect(agentError.hasCode(UnexpectedErrorCode)).toEqual(true);
  // another error code to test that hasCode works
  expect(agentError.hasCode(IdentityInvalidErrorCode)).toEqual(false);

  expect(errorCode.toErrorMessage()).toEqual(expectedErrorMessage);
  expect(errorCode.toString()).toEqual(expectedErrorMessage);
});
