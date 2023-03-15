'use strict';
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, '__esModule', { value: true });
exports.createAssetCanisterActor = void 0;
const actor_js_1 = require('../actor.js');
const asset_idl_js_1 = __importDefault(require('./asset_idl.js'));
/* tslint:enable */
/**
 * Create a management canister actor.
 * @param config
 */
function createAssetCanisterActor(config) {
  return actor_js_1.Actor.createActor(asset_idl_js_1.default, config);
}
exports.createAssetCanisterActor = createAssetCanisterActor;
//# sourceMappingURL=asset.js.map
