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
var __exportStar =
  (this && this.__exportStar) ||
  function (m, exports) {
    for (var p in m)
      if (p !== 'default' && !Object.prototype.hasOwnProperty.call(exports, p))
        __createBinding(exports, m, p);
  };
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
exports.Cbor = exports.CanisterStatus = exports.polling = void 0;
__exportStar(require('./actor.js'), exports);
__exportStar(require('./agent/index.js'), exports);
__exportStar(require('./auth.js'), exports);
__exportStar(require('./certificate.js'), exports);
__exportStar(require('./agent/http/transforms.js'), exports);
__exportStar(require('./canisters/asset.js'), exports);
__exportStar(require('./canisters/management.js'), exports);
__exportStar(require('./fetch_candid.js'), exports);
__exportStar(require('./request_id.js'), exports);
__exportStar(require('./utils/bls.js'), exports);
__exportStar(require('./utils/buffer.js'), exports);
exports.polling = __importStar(require('./polling/index.js'));
/**
 * The CanisterStatus utility is used to request structured data directly from the IC public API. This data can be accessed using agent.readState, but CanisterStatus provides a helpful abstraction with some known paths.
 *
 * You can request a canisters Controllers, ModuleHash, Candid interface, Subnet, or Time, or provide a custom path {@link CanisterStatus.CustomPath} and pass arbitrary buffers for valid paths identified in https://internetcomputer.org/docs/current/references/ic-interface-spec.
 *
 * The primary method for this namespace is {@link CanisterStatus.request}
 */
exports.CanisterStatus = __importStar(require('./canisterStatus/index.js'));
exports.Cbor = __importStar(require('./cbor.js'));
//# sourceMappingURL=index.js.map
