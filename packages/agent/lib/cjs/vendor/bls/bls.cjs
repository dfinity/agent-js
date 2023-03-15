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
exports.bls_verify = exports.bls_init = void 0;
const base64Arraybuffer = __importStar(require('base64-arraybuffer'));
// This WASM is generated from the miracl BLS Rust code (see
// https://github.com/dfinity/miracl_core_bls12381/)
const wasm_js_1 = require('./wasm.js');
/* tslint:disable */
/* eslint-disable */
let wasm;
const wasmBytes = base64Arraybuffer.decode(wasm_js_1.wasmBytesBase64);
/**
 * @returns {number}
 */
function bls_init() {
  let ret = wasm.bls_init();
  return ret;
}
exports.bls_init = bls_init;
let cachegetUint8Memory0 = null;
function getUint8Memory0() {
  if (cachegetUint8Memory0 === null || cachegetUint8Memory0.buffer !== wasm.memory.buffer) {
    cachegetUint8Memory0 = new Uint8Array(wasm.memory.buffer);
  }
  return cachegetUint8Memory0;
}
function passArray8ToWasm0(arg, malloc) {
  const ptr = malloc(arg.length * 1);
  getUint8Memory0().set(arg, ptr / 1);
  return [ptr, arg.length];
}
/**
 * @param {Uint8Array} sig
 * @param {Uint8Array} m
 * @param {Uint8Array} w
 * @returns {number}
 */
function bls_verify(sig, m, w) {
  const [ptr0, len0] = passArray8ToWasm0(sig, wasm.__wbindgen_malloc);
  const [ptr1, len1] = passArray8ToWasm0(m, wasm.__wbindgen_malloc);
  const [ptr2, len2] = passArray8ToWasm0(w, wasm.__wbindgen_malloc);
  const ret = wasm.bls_verify(ptr0, len0, ptr1, len1, ptr2, len2);
  return ret;
}
exports.bls_verify = bls_verify;
async function load(module, imports) {
  if (typeof Response === 'function' && module instanceof Response) {
    const bytes = await module.arrayBuffer();
    return await WebAssembly.instantiate(bytes, imports);
  } else {
    const instance = await WebAssembly.instantiate(module, imports);
    if (instance instanceof WebAssembly.Instance) {
      return { instance, module };
    } else {
      return instance;
    }
  }
}
async function init() {
  const imports = {};
  const { instance, module } = await load(wasmBytes, imports);
  wasm = instance.exports;
  init.__wbindgen_wasm_module = module;
  return wasm;
}
/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {InitInput | Promise<InitInput>} module_or_path
 *
 * @returns {Promise<InitOutput>}
 */
exports.default = init;
//# sourceMappingURL=bls.js.map
