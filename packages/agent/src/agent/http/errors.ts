import { RequestId } from 'src/request_id';
import { AgentError } from '../../errors';
import { HttpDetailsResponse } from '../api';
import { PublicKey, Signature } from 'src/auth';

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
    public readonly sender_pubkey: string,
    public readonly sender_sig: string,
  ) {
    super(message);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
