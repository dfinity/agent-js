/* eslint-disable no-prototype-builtins */
import { QueryResponseStatus, SubmitResponse } from './agent';
import {
  ActorCallError,
  AgentError,
  QueryCallRejectedError,
  UpdateCallRejectedError,
} from './errors';
import { RequestId } from './request_id';

test('AgentError', () => {
  const error = new AgentError('message');
  expect(error.message).toBe('message');
  expect(error.name).toBe('AgentError');
  expect(error instanceof Error).toBe(true);
  expect(error instanceof AgentError).toBe(true);
  expect(error instanceof ActorCallError).toBe(false);
  expect(AgentError.prototype.isPrototypeOf(error)).toBe(true);
});

test('ActorCallError', () => {
  const error = new ActorCallError('rrkah-fqaaa-aaaaa-aaaaq-cai', 'methodName', 'query', {
    props: 'props',
  });
  expect(error.message).toBe(`Call failed:
  Canister: rrkah-fqaaa-aaaaa-aaaaq-cai
  Method: methodName (query)
  "props": "props"`);
  expect(error.name).toBe('ActorCallError');
  expect(error instanceof Error).toBe(true);
  expect(error instanceof AgentError).toBe(true);
  expect(error instanceof ActorCallError).toBe(true);
  expect(ActorCallError.prototype.isPrototypeOf(error)).toBe(true);
});

test('QueryCallRejectedError', () => {
  const error = new QueryCallRejectedError('rrkah-fqaaa-aaaaa-aaaaq-cai', 'methodName', {
    status: QueryResponseStatus.Rejected,
    reject_code: 1,
    reject_message: 'reject_message',
    error_code: 'error_code',
  });
  expect(error.message).toBe(`Call failed:
  Canister: rrkah-fqaaa-aaaaa-aaaaq-cai
  Method: methodName (query)
  "Status": "rejected"
  "Code": "SysFatal"
  "Message": "reject_message"`);
  expect(error.name).toBe('QueryCallRejectedError');
  expect(error instanceof Error).toBe(true);
  expect(error instanceof AgentError).toBe(true);
  expect(error instanceof ActorCallError).toBe(true);
  expect(error instanceof QueryCallRejectedError).toBe(true);
  expect(QueryCallRejectedError.prototype.isPrototypeOf(error)).toBe(true);
});

test('UpdateCallRejectedError', () => {
  const response: SubmitResponse['response'] = {
    ok: false,
    status: 400,
    statusText: 'rejected',
    body: {
      error_code: 'error_code',
      reject_code: 1,
      reject_message: 'reject_message',
    },
    headers: [],
  };
  const error = new UpdateCallRejectedError(
    'rrkah-fqaaa-aaaaa-aaaaq-cai',
    'methodName',
    new ArrayBuffer(1) as RequestId,
    response,
  );
  expect(error.message).toBe(`Call failed:
  Canister: rrkah-fqaaa-aaaaa-aaaaq-cai
  Method: methodName (update)
  "Request ID": "00"
  "Error code": "error_code"
  "Reject code": "1"
  "Reject message": "reject_message"`);
  expect(error.name).toBe('UpdateCallRejectedError');
  expect(error instanceof Error).toBe(true);
  expect(error instanceof AgentError).toBe(true);
  expect(error instanceof ActorCallError).toBe(true);
  expect(error instanceof UpdateCallRejectedError).toBe(true);
  expect(UpdateCallRejectedError.prototype.isPrototypeOf(error)).toBe(true);
});
