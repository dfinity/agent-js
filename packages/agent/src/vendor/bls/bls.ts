import * as base64Arraybuffer from 'base64-arraybuffer';

// This WASM is generated from the miracl BLS Rust code (see
// https://github.com/dfinity/miracl_core_bls12381/)
import { wasmBytesBase64 } from './wasm';

/* tslint:disable */
/* eslint-disable */
let wasm: InitOutput;

const wasmBytes = base64Arraybuffer.decode(wasmBytesBase64);

/**
 * @returns {number}
 */
export function bls_init() {
  let ret = wasm.bls_init();
  return ret;
}

let cachegetUint8Memory0: any = null;
function getUint8Memory0() {
  if (cachegetUint8Memory0 === null || cachegetUint8Memory0.buffer !== wasm.memory.buffer) {
    cachegetUint8Memory0 = new Uint8Array(wasm.memory.buffer);
  }
  return cachegetUint8Memory0;
}

function passArray8ToWasm0(arg: any, malloc: any): [number, number] {
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
export function bls_verify(sig: Uint8Array, m: Uint8Array, w: Uint8Array): number {
  const [ptr0, len0] = passArray8ToWasm0(sig, wasm.__wbindgen_malloc);
  const [ptr1, len1] = passArray8ToWasm0(m, wasm.__wbindgen_malloc);
  const [ptr2, len2] = passArray8ToWasm0(w, wasm.__wbindgen_malloc);

  const ret = wasm.bls_verify(ptr0, len0, ptr1, len1, ptr2, len2);
  return ret;
}

async function load(module: any, imports: any) {
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

async function init(): Promise<InitOutput> {
  const imports = {};
  const { instance, module } = await load(wasmBytes, imports);

  wasm = instance.exports as any as InitOutput;
  (init as any).__wbindgen_wasm_module = module;

  return wasm;
}

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
  readonly memory: WebAssembly.Memory;
  readonly bls_init: () => number;
  readonly bls_verify: (a: number, b: number, c: number, d: number, e: number, f: number) => number;
  readonly __wbindgen_malloc: (a: number) => number;
}

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {InitInput | Promise<InitInput>} module_or_path
 *
 * @returns {Promise<InitOutput>}
 */
export default init;
