import { Principal } from '@dfinity/principal';
import {
  QueryResponseRejected,
  ReplicaRejectCode,
  SubmitResponse,
  v2ResponseBody,
} from './agent/api';
import { RequestId } from './request_id';
import { toHex } from './utils/buffer';

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
