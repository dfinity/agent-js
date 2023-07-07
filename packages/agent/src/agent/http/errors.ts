export class AgentHTTPResponseError extends Error {
  constructor(message: string, public readonly response: Response) {
    super(message);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
