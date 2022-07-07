# How to Generate `wasm.ts`

This WASM is generated from the miracl BLS Rust code (see https://github.com/dfinity/miracl_core_bls12381/)

Run the following commands to build, minify, and base64 encode the wasm.

```bash
wasm-pack build --out-name bls --no-default-features --features="wasm-bindgen allow_alt_compress" --profile=wasm

echo -n "export const wasmBytesBase64 = \`" >pkg/wasm.ts
base64 ./pkg/bls_bg.wasm | tr -d "\n" >>pkg/wasm.ts
echo "\`;" >>pkg/wasm.ts
```

Copy the resulting `pkg/wasm.ts` to `packages/agent/src/vendor/bls/wasm.ts`.
