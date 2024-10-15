import { v2ResponseBody, v3ResponseBody } from './agent';
import { HttpHeaderField } from './agent/http/types';
import { RequestId } from './request_id';

/**
 * An error that happens in the Agent. This is the root of all errors and should be used
 * everywhere in the Agent code (this package).
 *
 * @todo https://github.com/dfinity/agent-js/issues/420
 */
export class AgentError extends Error {
  constructor(public readonly message: string) {
    super(message);
    Object.setPrototypeOf(this, AgentError.prototype);
  }
}

export class AgentCallError extends AgentError {
  public name = 'AgentCallError';
  constructor(
    public readonly message: string,
    public readonly response: {
      ok: boolean;
      status: number;
      statusText: string;
      body: v2ResponseBody | v3ResponseBody | null;
      headers: HttpHeaderField[];
    },
    public readonly requestId: RequestId,
  ) {
    super(message);
    Object.setPrototypeOf(this, AgentCallError.prototype);
  }
}
