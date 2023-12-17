"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createActor = exports.canisterId = exports.idlFactory = void 0;
var agent_1 = require("@dfinity/agent");
// Imports and re-exports candid interface
var b3_system_did_js_1 = require("./b3_system.did.js");
var b3_system_did_js_2 = require("./b3_system.did.js");
Object.defineProperty(exports, "idlFactory", { enumerable: true, get: function () { return b3_system_did_js_2.idlFactory; } });
/* CANISTER_ID is replaced by webpack based on node environment
 * Note: canister environment variable will be standardized as
 * process.env.CANISTER_ID_<CANISTER_NAME_UPPERCASE>
 * beginning in dfx 0.15.0
 */
exports.canisterId = process.env.CANISTER_ID_B3_SYSTEM || process.env.B3_SYSTEM_CANISTER_ID;
var createActor = function (canisterId, options) {
    if (options === void 0) { options = {}; }
    var agent = options.agent || new agent_1.HttpAgent(__assign({}, options.agentOptions));
    if (options.agent && options.agentOptions) {
        console.warn('Detected both agent and agentOptions passed to createActor. Ignoring agentOptions and proceeding with the provided agent.');
    }
    // Fetch root key for certificate validation during development
    if (process.env.DFX_NETWORK !== 'ic') {
        agent.fetchRootKey().catch(function (err) {
            console.warn('Unable to fetch root key. Check to ensure that your local replica is running');
            console.error(err);
        });
    }
    // Creates an actor with using the candid interface and the HttpAgent
    return agent_1.Actor.createActor(b3_system_did_js_1.idlFactory, __assign({ agent: agent, canisterId: canisterId }, options.actorOptions));
};
exports.createActor = createActor;
//# sourceMappingURL=index.js.map