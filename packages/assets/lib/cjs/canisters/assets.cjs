'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.getAssetsCanister = void 0;
const agent_1 = require('@dfinity/agent');
const assets_idl_js_1 = require('./assets_idl.js');
/**
 * Create an assets canister actor
 * @param config Configuration to make calls to the Replica.
 */
function getAssetsCanister(config) {
  return agent_1.Actor.createActor(assets_idl_js_1.idlFactory, config);
}
exports.getAssetsCanister = getAssetsCanister;
//# sourceMappingURL=assets.js.map
