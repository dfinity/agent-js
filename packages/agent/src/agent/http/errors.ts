import { HttpAgent } from '.';
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

export class ReplicaTimeError extends AgentError {
  public readonly replicaTime: Date;
  public readonly agent: HttpAgent;

  constructor(message: string, replicaTime: Date, agent: HttpAgent) {
    super(message);
    this.name = 'ReplicaTimeError';
    this.replicaTime = replicaTime;
    this.agent = agent;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
