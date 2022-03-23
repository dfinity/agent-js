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
