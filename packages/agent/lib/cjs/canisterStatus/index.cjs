'use strict';
/** @module CanisterStatus */
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
exports.encodePath = exports.request = void 0;
const candid_1 = require('@dfinity/candid');
const principal_1 = require('@dfinity/principal');
const errors_js_1 = require('../errors.js');
const index_js_1 = require('../agent/http/index.js');
const certificate_js_1 = require('../certificate.js');
const buffer_js_1 = require('../utils/buffer.js');
const Cbor = __importStar(require('../cbor.js'));
/**
 *
 * @param {CanisterStatusOptions} options {@link CanisterStatusOptions}
 * @param {CanisterStatusOptions['canisterId']} options.canisterId {@link Principal}
 * @param {CanisterStatusOptions['agent']} options.agent {@link AbstractAgent} optional authenticated agent to use to make the canister request. Useful for accessing private metadata under icp:private
 * @param {CanisterStatusOptions['paths']} options.paths {@link Path[]}
 * @returns {Status} object populated with data from the requested paths
 * @example
 * const status = await canisterStatus({
 *   paths: ['controllers', 'candid'],
 *   ...options
 * });
 *
 * const controllers = status.get('controllers');
 */
const request = async options => {
  const { canisterId, agent, paths } = options;
  const uniquePaths = [...new Set(paths)];
  // Map path options to their correct formats
  const encodedPaths = uniquePaths.map(path => {
    return (0, exports.encodePath)(path, principal_1.Principal.from(canisterId));
  });
  const status = new Map();
  const promises = uniquePaths.map((path, index) => {
    return (async () => {
      var _a, _b;
      try {
        const response = await agent.readState(canisterId, {
          paths: [encodedPaths[index]],
        });
        const cert = await certificate_js_1.Certificate.create({
          certificate: response.certificate,
          rootKey:
            (_a = agent.rootKey) !== null && _a !== void 0
              ? _a
              : (0, buffer_js_1.fromHex)(index_js_1.IC_ROOT_KEY),
          canisterId: canisterId,
        });
        const data = cert.lookup(
          (0, exports.encodePath)(uniquePaths[index], principal_1.Principal.from(canisterId)),
        );
        if (!data) {
          // Typically, the cert lookup will throw
          console.warn(`Expected to find result for path ${path}, but instead found nothing.`);
          if (typeof path === 'string') {
            status.set(path, null);
          } else {
            status.set(path.key, null);
          }
        } else {
          switch (path) {
            case 'time': {
              status.set(path, decodeTime(data));
              break;
            }
            case 'controllers': {
              status.set(path, decodeControllers(data));
              break;
            }
            case 'module_hash': {
              status.set(path, decodeHex(data));
              break;
            }
            case 'candid': {
              status.set(path, new TextDecoder().decode(data));
              break;
            }
            default: {
              // Check for CustomPath signature
              if (typeof path !== 'string' && 'key' in path && 'path' in path) {
                switch (path.decodeStrategy) {
                  case 'raw':
                    status.set(path.key, data);
                    break;
                  case 'leb128': {
                    status.set(path.key, decodeLeb128(data));
                    break;
                  }
                  case 'cbor': {
                    status.set(path.key, decodeCbor(data));
                    break;
                  }
                  case 'hex': {
                    status.set(path.key, decodeHex(data));
                    break;
                  }
                  case 'utf-8': {
                    status.set(path.key, decodeUtf8(data));
                  }
                }
              }
            }
          }
        }
      } catch (error) {
        // Break on signature verification errors
        if (
          (_b = error === null || error === void 0 ? void 0 : error.message) === null ||
          _b === void 0
            ? void 0
            : _b.includes('Invalid certificate')
        ) {
          throw new errors_js_1.AgentError(error.message);
        }
        if (typeof path !== 'string' && 'key' in path && 'path' in path) {
          status.set(path.key, null);
        } else {
          status.set(path, null);
        }
        console.group();
        console.warn(`Expected to find result for path ${path}, but instead found nothing.`);
        console.warn(error);
        console.groupEnd();
      }
    })();
  });
  // Fetch all values separately, as each option can fail
  await Promise.all(promises);
  return status;
};
exports.request = request;
const encodePath = (path, canisterId) => {
  const encoder = new TextEncoder();
  const encode = arg => {
    return new DataView(encoder.encode(arg).buffer).buffer;
  };
  const canisterBuffer = new DataView(canisterId.toUint8Array().buffer).buffer;
  switch (path) {
    case 'time':
      return [encode('time')];
    case 'controllers':
      return [encode('canister'), canisterBuffer, encode('controllers')];
    case 'module_hash':
      return [encode('canister'), canisterBuffer, encode('module_hash')];
    case 'subnet':
      return [encode('subnet')];
    case 'candid':
      return [encode('canister'), canisterBuffer, encode('metadata'), encode('candid:service')];
    default: {
      // Check for CustomPath signature
      if ('key' in path && 'path' in path) {
        // For simplified metadata queries
        if (typeof path['path'] === 'string' || path['path'] instanceof ArrayBuffer) {
          const metaPath = path.path;
          const encoded = typeof metaPath === 'string' ? encode(metaPath) : metaPath;
          return [encode('canister'), canisterBuffer, encode('metadata'), encoded];
          // For non-metadata, return the provided custompath
        } else {
          return path['path'];
        }
      }
    }
  }
  throw new Error(
    `An unexpeected error was encountered while encoding your path for canister status. Please ensure that your path, ${path} was formatted correctly.`,
  );
};
exports.encodePath = encodePath;
const decodeHex = buf => {
  return (0, buffer_js_1.toHex)(buf);
};
const decodeLeb128 = buf => {
  return (0, candid_1.lebDecode)(new candid_1.PipeArrayBuffer(buf));
};
const decodeCbor = buf => {
  return Cbor.decode(buf);
};
const decodeUtf8 = buf => {
  return new TextDecoder().decode(buf);
};
// time is a LEB128-encoded Nat
const decodeTime = buf => {
  const decoded = decodeLeb128(buf);
  return new Date(Number(decoded / BigInt(1000000)));
};
// Controllers are CBOR-encoded buffers, starting with a Tag we don't need
const decodeControllers = buf => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [tag, ...controllersRaw] = decodeCbor(buf);
  return controllersRaw.map(buf => {
    return principal_1.Principal.fromUint8Array(new Uint8Array(buf));
  });
};
//# sourceMappingURL=index.js.map
