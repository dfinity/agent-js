# How to generate bls.wasm

The Wasm is generated from the BLS Rust code of the Agent RS (see http://github.com/dfinity/agent-rs/),
with the following `Cargo.toml`.

```
[dependencies]
wasm-bindgen = "0.2.70"

[profile.release]
lto = true
opt-level = 'z'
```

To build the package, run `wasm-pack build --target web`. You can base64 encode the wasm binary and
paste it into `bls.ts`.
