'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.pollForResponse = exports.defaultStrategy = void 0;
const index_js_1 = require('../agent/index.js');
const certificate_js_1 = require('../certificate.js');
const buffer_js_1 = require('../utils/buffer.js');
var strategy_js_1 = require('./strategy.js');
Object.defineProperty(exports, 'defaultStrategy', {
  enumerable: true,
  get: function () {
    return strategy_js_1.defaultStrategy;
  },
});
/**
 * Polls the IC to check the status of the given request then
 * returns the response bytes once the request has been processed.
 * @param agent The agent to use to poll read_state.
 * @param canisterId The effective canister ID.
 * @param requestId The Request ID to poll status for.
 * @param strategy A polling strategy.
 * @param request Request for the readState call.
 */
async function pollForResponse(
  agent,
  canisterId,
  requestId,
  strategy,
  // eslint-disable-next-line
  request,
  blsVerify,
) {
  var _a;
  const path = [new TextEncoder().encode('request_status'), requestId];
  const currentRequest =
    request !== null && request !== void 0
      ? request
      : await ((_a = agent.createReadStateRequest) === null || _a === void 0
          ? void 0
          : _a.call(agent, { paths: [path] }));
  const state = await agent.readState(canisterId, { paths: [path] }, undefined, currentRequest);
  if (agent.rootKey == null) throw new Error('Agent root key not initialized before polling');
  const cert = await certificate_js_1.Certificate.create({
    certificate: state.certificate,
    rootKey: agent.rootKey,
    canisterId: canisterId,
    blsVerify,
  });
  const maybeBuf = cert.lookup([...path, new TextEncoder().encode('status')]);
  let status;
  if (typeof maybeBuf === 'undefined') {
    // Missing requestId means we need to wait
    status = index_js_1.RequestStatusResponseStatus.Unknown;
  } else {
    status = new TextDecoder().decode(maybeBuf);
  }
  switch (status) {
    case index_js_1.RequestStatusResponseStatus.Replied: {
      return cert.lookup([...path, 'reply']);
    }
    case index_js_1.RequestStatusResponseStatus.Received:
    case index_js_1.RequestStatusResponseStatus.Unknown:
    case index_js_1.RequestStatusResponseStatus.Processing:
      // Execute the polling strategy, then retry.
      await strategy(canisterId, requestId, status);
      return pollForResponse(agent, canisterId, requestId, strategy, currentRequest);
    case index_js_1.RequestStatusResponseStatus.Rejected: {
      const rejectCode = new Uint8Array(cert.lookup([...path, 'reject_code']))[0];
      const rejectMessage = new TextDecoder().decode(cert.lookup([...path, 'reject_message']));
      throw new Error(
        `Call was rejected:\n` +
          `  Request ID: ${(0, buffer_js_1.toHex)(requestId)}\n` +
          `  Reject code: ${rejectCode}\n` +
          `  Reject text: ${rejectMessage}\n`,
      );
    }
    case index_js_1.RequestStatusResponseStatus.Done:
      // This is _technically_ not an error, but we still didn't see the `Replied` status so
      // we don't know the result and cannot decode it.
      throw new Error(
        `Call was marked as done but we never saw the reply:\n` +
          `  Request ID: ${(0, buffer_js_1.toHex)(requestId)}\n`,
      );
  }
  throw new Error('unreachable');
}
exports.pollForResponse = pollForResponse;
//# sourceMappingURL=index.js.map
