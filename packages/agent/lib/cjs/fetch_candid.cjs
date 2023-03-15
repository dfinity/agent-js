'use strict';
var __createBinding =
  (this && this.__createBinding) ||
  (Object.create
    ? function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        var desc = Object.getOwnPropertyDescriptor(m, k);
        if (!desc || ('get' in desc ? !m.__esModule : desc.writable || desc.configurable)) {
          desc = {
            enumerable: true,
            get: function () {
              return m[k];
            },
          };
        }
        Object.defineProperty(o, k2, desc);
      }
    : function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        o[k2] = m[k];
      });
var __setModuleDefault =
  (this && this.__setModuleDefault) ||
  (Object.create
    ? function (o, v) {
        Object.defineProperty(o, 'default', { enumerable: true, value: v });
      }
    : function (o, v) {
        o['default'] = v;
      });
var __importStar =
  (this && this.__importStar) ||
  function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null)
      for (var k in mod)
        if (k !== 'default' && Object.prototype.hasOwnProperty.call(mod, k))
          __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
  };
Object.defineProperty(exports, '__esModule', { value: true });
exports.fetchCandid = void 0;
const principal_1 = require('@dfinity/principal');
const CanisterStatus = __importStar(require('./canisterStatus/index.js'));
const index_js_1 = require('./agent/http/index.js');
const actor_js_1 = require('./actor.js');
/**
 * Retrieves the Candid interface for the specified canister.
 *
 * @param agent The agent to use for the request (usually an `HttpAgent`)
 * @param canisterId A string corresponding to the canister ID
 * @returns Candid source code
 */
async function fetchCandid(canisterId, agent) {
  if (!agent) {
    // Create an anonymous `HttpAgent` (adapted from Candid UI)
    agent = new index_js_1.HttpAgent();
    if (agent.isLocal()) {
      agent.fetchRootKey();
    }
  }
  // Attempt to use canister metadata
  const status = await CanisterStatus.request({
    agent,
    canisterId: principal_1.Principal.fromText(canisterId),
    paths: ['candid'],
  });
  const candid = status.get('candid');
  if (candid) {
    return candid;
  }
  // Use `__get_candid_interface_tmp_hack` for canisters without Candid metadata
  const tmpHackInterface = ({ IDL }) =>
    IDL.Service({
      __get_candid_interface_tmp_hack: IDL.Func([], [IDL.Text], ['query']),
    });
  const actor = actor_js_1.Actor.createActor(tmpHackInterface, { agent, canisterId });
  return await actor.__get_candid_interface_tmp_hack();
}
exports.fetchCandid = fetchCandid;
//# sourceMappingURL=fetch_candid.js.map
