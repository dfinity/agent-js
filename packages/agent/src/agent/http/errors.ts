import { AgentError } from '../../errors';
import { HttpDetailsResponse } from '../api';

export class AgentHTTPResponseError extends AgentError {
  constructor(
    message: string,
    public readonly response: HttpDetailsResponse,
  ) {
    super(message);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class AgentCallError extends AgentError {
  constructor(
    message: string,
    public readonly response: HttpDetailsResponse,
    public readonly requestId: string,
    public readonly senderPubkey: string,
    public readonly senderSig: string,
    public readonly ingressExpiry: string,
  ) {
    super(message);
    this.name = 'AgentCallError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
