How to generate bls.wasm
=====

The bls.wasm is generated from https://github.com/miracl/core at revision f9de005e0168f59a56afe177498b19f4d43f054f
with these steps:

* Install `emsdk`, and run `source ./emsdk_env.sh --build=Release`
* `cp wasm/config*.py c/`
* `cd c/`
* `python3 config32.py`
* Select BLS12381 (enter 31, then enter 0)
* Patch the code as follows:
  * `config_curve_BLS12381.h`: enable `#define ALLOW_ALT_COMPRESS_BLS12381`
  * `bls_BLS12381.c`: Change the domain separator to `BLS_SIG_BLS12381G1_XMD:SHA-256_SSWU_RO_NUL_` (in `BLS_HASH_TO_POINT` function)
  * `bls_BLS12381.c`: Do not use the "new multi-pairing mechanism", but the alternative in `BLS_BLS12381_CORE_VERIFY` function.
  * Create `mainBLS.c`
```
#include <emscripten.h>
#include <string.h>
#include "bls_BLS12381.h"

EMSCRIPTEN_KEEPALIVE
int init() {
  return BLS_BLS12381_INIT();
}

EMSCRIPTEN_KEEPALIVE
bool verify(char *pk, char *sig, char *msg) {
  size_t pk_len = strlen(pk);
  size_t sig_len = strlen(sig);
  size_t msg_len = strlen(msg);
  octet SIG = {0, sig_len, (char*)malloc((sig_len+1)*sizeof(char))};
  octet M = {0, msg_len, (char*)malloc((msg_len+1)*sizeof(char))};
  octet W = {0, pk_len, (char*)malloc((pk_len+1)*sizeof(char))};
  OCT_fromHex(&SIG, sig);
  OCT_fromHex(&M, msg);
  OCT_fromHex(&W, pk);
  int res = BLS_BLS12381_CORE_VERIFY(&SIG, &M, &W);
  if (res == BLS_OK) return true;
  return false;
}
```
* Run `python3 config32.py` again to get the patched `core.a`
* `emcc -O3 mainBLS.c core.a -s WASM=1 -s EXTRA_EXPORTED_RUNTIME_METHODS='["cwrap"]' -s MODULARIZE=1 -o bls.js`
