'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.AgentError = void 0;
/**
 * An error that happens in the Agent. This is the root of all errors and should be used
 * everywhere in the Agent code (this package).
 *
 * @todo https://github.com/dfinity/agent-js/issues/420
 */
class AgentError extends Error {
  constructor(message) {
    super(message);
    this.message = message;
    Object.setPrototypeOf(this, AgentError.prototype);
  }
}
exports.AgentError = AgentError;
//# sourceMappingURL=errors.js.map
