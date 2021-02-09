/* tslint:disable */
/* eslint-disable */
/**
* @returns {number}
*/
export function bls_init(): number;
/**
* @param {Uint8Array} sig
* @param {Uint8Array} m
* @param {Uint8Array} w
* @returns {number}
*/
export function bls_verify(sig: Uint8Array, m: Uint8Array, w: Uint8Array): number;

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
export default function init (module_or_path?: InitInput | Promise<InitInput>): Promise<InitOutput>;
        