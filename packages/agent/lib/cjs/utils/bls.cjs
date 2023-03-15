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
exports.blsVerify = exports.verify = void 0;
const bls_js_1 = __importStar(require('../vendor/bls/bls.js'));
/**
 *
 * @param pk primary key: Uint8Array
 * @param sig signature: Uint8Array
 * @param msg message: Uint8Array
 * @returns Promise resolving a boolean
 */
async function blsVerify(pk, sig, msg) {
  if (!exports.verify) {
    await (0, bls_js_1.default)();
    if ((0, bls_js_1.bls_init)() !== 0) {
      throw new Error('Cannot initialize BLS');
    }
    exports.verify = (pk1, sig1, msg1) => {
      // Reorder things from what the WASM expects (sig, m, w).
      return (0, bls_js_1.bls_verify)(sig1, msg1, pk1) === 0;
    };
  }
  return (0, exports.verify)(pk, sig, msg);
}
exports.blsVerify = blsVerify;
//# sourceMappingURL=bls.js.map
