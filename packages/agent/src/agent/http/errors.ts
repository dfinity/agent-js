import { AgentError } from '../../errors';
import { HttpDetailsResponse } from '../api';

export class AgentHTTPResponseError extends AgentError {
  constructor(message: string, public readonly response: HttpDetailsResponse) {
    super(message);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
