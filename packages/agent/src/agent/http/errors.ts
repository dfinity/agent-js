import { HttpDetailsResponse } from '../api';


export class HttpAgentError extends Error {
  constructor(message: string, public readonly originalError?: Error) {
    super(message);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class AgentHTTPResponseError extends HttpAgentError {
  constructor(message: string, public readonly response: HttpDetailsResponse) {
    super(message);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export type Log =
  | HttpAgentError
  | {
      message: string;
      level: 'error' | 'warn' | 'info';
    };
