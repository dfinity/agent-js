/* eslint-disable */
// Extracted from @noble/curves commit fb02e93ff66ecd7bc7257d8f76e6cdf88b54bfa9
export default () => {
  var __defProp = Object.defineProperty;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __esm = (fn, res) =>
    function __init() {
      return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])((fn = 0))), res;
    };
  var __commonJS = (cb, mod2) =>
    function __require() {
      return (
        mod2 || (0, cb[__getOwnPropNames(cb)[0]])((mod2 = { exports: {} }).exports, mod2),
        mod2.exports
      );
    };
  var __export = (target, all) => {
    for (var name in all) __defProp(target, name, { get: all[name], enumerable: true });
  };

  // node_modules/@noble/hashes/esm/_assert.js
  function bytes(b, ...lengths) {
    if (!(b instanceof Uint8Array)) throw new Error('Expected Uint8Array');
    if (lengths.length > 0 && !lengths.includes(b.length))
      throw new Error(`Expected Uint8Array of length ${lengths}, not of length=${b.length}`);
  }
  function exists(instance, checkFinished = true) {
    if (instance.destroyed) throw new Error('Hash instance has been destroyed');
    if (checkFinished && instance.finished)
      throw new Error('Hash#digest() has already been called');
  }
  function output(out, instance) {
    bytes(out);
    const min = instance.outputLen;
    if (out.length < min) {
      throw new Error(`digestInto() expects output buffer of length at least ${min}`);
    }
  }
  var init_assert = __esm({
    'node_modules/@noble/hashes/esm/_assert.js'() {},
  });

  // node_modules/@noble/hashes/esm/crypto.js
  var crypto;
  var init_crypto = __esm({
    'node_modules/@noble/hashes/esm/crypto.js'() {
      crypto =
        typeof globalThis === 'object' && 'crypto' in globalThis ? globalThis.crypto : void 0;
    },
  });

  // node_modules/@noble/hashes/esm/utils.js
  function utf8ToBytes(str) {
    if (typeof str !== 'string') throw new Error(`utf8ToBytes expected string, got ${typeof str}`);
    return new Uint8Array(new TextEncoder().encode(str));
  }
  function toBytes(data) {
    if (typeof data === 'string') data = utf8ToBytes(data);
    if (!u8a(data)) throw new Error(`expected Uint8Array, got ${typeof data}`);
    return data;
  }
  function wrapConstructor(hashCons) {
    const hashC = msg => hashCons().update(toBytes(msg)).digest();
    const tmp = hashCons();
    hashC.outputLen = tmp.outputLen;
    hashC.blockLen = tmp.blockLen;
    hashC.create = () => hashCons();
    return hashC;
  }
  function randomBytes(bytesLength = 32) {
    if (crypto && typeof crypto.getRandomValues === 'function') {
      return crypto.getRandomValues(new Uint8Array(bytesLength));
    }
    throw new Error('crypto.getRandomValues must be defined');
  }
  var u8a, createView, rotr, isLE, Hash, toStr;
  var init_utils = __esm({
    'node_modules/@noble/hashes/esm/utils.js'() {
      init_crypto();
      u8a = a => a instanceof Uint8Array;
      createView = arr => new DataView(arr.buffer, arr.byteOffset, arr.byteLength);
      rotr = (word, shift) => (word << (32 - shift)) | (word >>> shift);
      isLE = new Uint8Array(new Uint32Array([287454020]).buffer)[0] === 68;
      if (!isLE) throw new Error('Non little-endian hardware is not supported');
      Hash = class {
        // Safe version that clones internal state
        clone() {
          return this._cloneInto();
        }
      };
      toStr = {}.toString;
    },
  });

  // node_modules/@noble/hashes/esm/_sha2.js
  function setBigUint64(view, byteOffset, value, isLE2) {
    if (typeof view.setBigUint64 === 'function') return view.setBigUint64(byteOffset, value, isLE2);
    const _32n = BigInt(32);
    const _u32_max = BigInt(4294967295);
    const wh = Number((value >> _32n) & _u32_max);
    const wl = Number(value & _u32_max);
    const h = isLE2 ? 4 : 0;
    const l = isLE2 ? 0 : 4;
    view.setUint32(byteOffset + h, wh, isLE2);
    view.setUint32(byteOffset + l, wl, isLE2);
  }
  var SHA2;
  var init_sha2 = __esm({
    'node_modules/@noble/hashes/esm/_sha2.js'() {
      init_assert();
      init_utils();
      SHA2 = class extends Hash {
        constructor(blockLen, outputLen, padOffset, isLE2) {
          super();
          this.blockLen = blockLen;
          this.outputLen = outputLen;
          this.padOffset = padOffset;
          this.isLE = isLE2;
          this.finished = false;
          this.length = 0;
          this.pos = 0;
          this.destroyed = false;
          this.buffer = new Uint8Array(blockLen);
          this.view = createView(this.buffer);
        }
        update(data) {
          exists(this);
          const { view, buffer, blockLen } = this;
          data = toBytes(data);
          const len = data.length;
          for (let pos = 0; pos < len; ) {
            const take = Math.min(blockLen - this.pos, len - pos);
            if (take === blockLen) {
              const dataView = createView(data);
              for (; blockLen <= len - pos; pos += blockLen) this.process(dataView, pos);
              continue;
            }
            buffer.set(data.subarray(pos, pos + take), this.pos);
            this.pos += take;
            pos += take;
            if (this.pos === blockLen) {
              this.process(view, 0);
              this.pos = 0;
            }
          }
          this.length += data.length;
          this.roundClean();
          return this;
        }
        digestInto(out) {
          exists(this);
          output(out, this);
          this.finished = true;
          const { buffer, view, blockLen, isLE: isLE2 } = this;
          let { pos } = this;
          buffer[pos++] = 128;
          this.buffer.subarray(pos).fill(0);
          if (this.padOffset > blockLen - pos) {
            this.process(view, 0);
            pos = 0;
          }
          for (let i = pos; i < blockLen; i++) buffer[i] = 0;
          setBigUint64(view, blockLen - 8, BigInt(this.length * 8), isLE2);
          this.process(view, 0);
          const oview = createView(out);
          const len = this.outputLen;
          if (len % 4) throw new Error('_sha2: outputLen should be aligned to 32bit');
          const outLen = len / 4;
          const state = this.get();
          if (outLen > state.length) throw new Error('_sha2: outputLen bigger than state');
          for (let i = 0; i < outLen; i++) oview.setUint32(4 * i, state[i], isLE2);
        }
        digest() {
          const { buffer, outputLen } = this;
          this.digestInto(buffer);
          const res = buffer.slice(0, outputLen);
          this.destroy();
          return res;
        }
        _cloneInto(to) {
          to || (to = new this.constructor());
          to.set(...this.get());
          const { blockLen, buffer, length, finished, destroyed, pos } = this;
          to.length = length;
          to.pos = pos;
          to.finished = finished;
          to.destroyed = destroyed;
          if (length % blockLen) to.buffer.set(buffer);
          return to;
        }
      };
    },
  });

  // node_modules/@noble/hashes/esm/sha256.js
  var Chi, Maj, SHA256_K, IV, SHA256_W, SHA256, sha256;
  var init_sha256 = __esm({
    'node_modules/@noble/hashes/esm/sha256.js'() {
      init_sha2();
      init_utils();
      Chi = (a, b, c) => (a & b) ^ (~a & c);
      Maj = (a, b, c) => (a & b) ^ (a & c) ^ (b & c);
      SHA256_K = /* @__PURE__ */ new Uint32Array([
        1116352408, 1899447441, 3049323471, 3921009573, 961987163, 1508970993, 2453635748,
        2870763221, 3624381080, 310598401, 607225278, 1426881987, 1925078388, 2162078206,
        2614888103, 3248222580, 3835390401, 4022224774, 264347078, 604807628, 770255983, 1249150122,
        1555081692, 1996064986, 2554220882, 2821834349, 2952996808, 3210313671, 3336571891,
        3584528711, 113926993, 338241895, 666307205, 773529912, 1294757372, 1396182291, 1695183700,
        1986661051, 2177026350, 2456956037, 2730485921, 2820302411, 3259730800, 3345764771,
        3516065817, 3600352804, 4094571909, 275423344, 430227734, 506948616, 659060556, 883997877,
        958139571, 1322822218, 1537002063, 1747873779, 1955562222, 2024104815, 2227730452,
        2361852424, 2428436474, 2756734187, 3204031479, 3329325298,
      ]);
      IV = /* @__PURE__ */ new Uint32Array([
        1779033703, 3144134277, 1013904242, 2773480762, 1359893119, 2600822924, 528734635,
        1541459225,
      ]);
      SHA256_W = /* @__PURE__ */ new Uint32Array(64);
      SHA256 = class extends SHA2 {
        constructor() {
          super(64, 32, 8, false);
          this.A = IV[0] | 0;
          this.B = IV[1] | 0;
          this.C = IV[2] | 0;
          this.D = IV[3] | 0;
          this.E = IV[4] | 0;
          this.F = IV[5] | 0;
          this.G = IV[6] | 0;
          this.H = IV[7] | 0;
        }
        get() {
          const { A, B, C, D, E, F, G, H } = this;
          return [A, B, C, D, E, F, G, H];
        }
        // prettier-ignore
        set(A, B, C, D, E, F, G, H) {
          this.A = A | 0;
          this.B = B | 0;
          this.C = C | 0;
          this.D = D | 0;
          this.E = E | 0;
          this.F = F | 0;
          this.G = G | 0;
          this.H = H | 0;
        }
        process(view, offset) {
          for (let i = 0; i < 16; i++, offset += 4) SHA256_W[i] = view.getUint32(offset, false);
          for (let i = 16; i < 64; i++) {
            const W15 = SHA256_W[i - 15];
            const W2 = SHA256_W[i - 2];
            const s0 = rotr(W15, 7) ^ rotr(W15, 18) ^ (W15 >>> 3);
            const s1 = rotr(W2, 17) ^ rotr(W2, 19) ^ (W2 >>> 10);
            SHA256_W[i] = (s1 + SHA256_W[i - 7] + s0 + SHA256_W[i - 16]) | 0;
          }
          let { A, B, C, D, E, F, G, H } = this;
          for (let i = 0; i < 64; i++) {
            const sigma1 = rotr(E, 6) ^ rotr(E, 11) ^ rotr(E, 25);
            const T1 = (H + sigma1 + Chi(E, F, G) + SHA256_K[i] + SHA256_W[i]) | 0;
            const sigma0 = rotr(A, 2) ^ rotr(A, 13) ^ rotr(A, 22);
            const T2 = (sigma0 + Maj(A, B, C)) | 0;
            H = G;
            G = F;
            F = E;
            E = (D + T1) | 0;
            D = C;
            C = B;
            B = A;
            A = (T1 + T2) | 0;
          }
          A = (A + this.A) | 0;
          B = (B + this.B) | 0;
          C = (C + this.C) | 0;
          D = (D + this.D) | 0;
          E = (E + this.E) | 0;
          F = (F + this.F) | 0;
          G = (G + this.G) | 0;
          H = (H + this.H) | 0;
          this.set(A, B, C, D, E, F, G, H);
        }
        roundClean() {
          SHA256_W.fill(0);
        }
        destroy() {
          this.set(0, 0, 0, 0, 0, 0, 0, 0);
          this.buffer.fill(0);
        }
      };
      sha256 = /* @__PURE__ */ wrapConstructor(() => new SHA256());
    },
  });

  // node_modules/@noble/curves/esm/abstract/utils.js
  var utils_exports = {};
  __export(utils_exports, {
    bitGet: () => bitGet,
    bitLen: () => bitLen,
    bitMask: () => bitMask,
    bitSet: () => bitSet,
    bytesToHex: () => bytesToHex,
    bytesToNumberBE: () => bytesToNumberBE,
    bytesToNumberLE: () => bytesToNumberLE,
    concatBytes: () => concatBytes,
    createHmacDrbg: () => createHmacDrbg,
    ensureBytes: () => ensureBytes,
    equalBytes: () => equalBytes,
    hexToBytes: () => hexToBytes,
    hexToNumber: () => hexToNumber,
    numberToBytesBE: () => numberToBytesBE,
    numberToBytesLE: () => numberToBytesLE,
    numberToHexUnpadded: () => numberToHexUnpadded,
    numberToVarBytesBE: () => numberToVarBytesBE,
    utf8ToBytes: () => utf8ToBytes2,
    validateObject: () => validateObject,
  });
  function bytesToHex(bytes2) {
    if (!u8a2(bytes2)) throw new Error('Uint8Array expected');
    let hex = '';
    for (let i = 0; i < bytes2.length; i++) {
      hex += hexes[bytes2[i]];
    }
    return hex;
  }
  function numberToHexUnpadded(num) {
    const hex = num.toString(16);
    return hex.length & 1 ? `0${hex}` : hex;
  }
  function hexToNumber(hex) {
    if (typeof hex !== 'string') throw new Error('hex string expected, got ' + typeof hex);
    return BigInt(hex === '' ? '0' : `0x${hex}`);
  }
  function asciiToBase16(char) {
    if (char >= asciis._0 && char <= asciis._9) return char - asciis._0;
    if (char >= asciis._A && char <= asciis._F) return char - (asciis._A - 10);
    if (char >= asciis._a && char <= asciis._f) return char - (asciis._a - 10);
    return;
  }
  function hexToBytes(hex) {
    if (typeof hex !== 'string') throw new Error('hex string expected, got ' + typeof hex);
    const hl = hex.length;
    const al = hl / 2;
    if (hl % 2) throw new Error('padded hex string expected, got unpadded hex of length ' + hl);
    const array = new Uint8Array(al);
    for (let ai = 0, hi = 0; ai < al; ai++, hi += 2) {
      const n1 = asciiToBase16(hex.charCodeAt(hi));
      const n2 = asciiToBase16(hex.charCodeAt(hi + 1));
      if (n1 === void 0 || n2 === void 0) {
        const char = hex[hi] + hex[hi + 1];
        throw new Error('hex string expected, got non-hex character "' + char + '" at index ' + hi);
      }
      array[ai] = n1 * 16 + n2;
    }
    return array;
  }
  function bytesToNumberBE(bytes2) {
    return hexToNumber(bytesToHex(bytes2));
  }
  function bytesToNumberLE(bytes2) {
    if (!u8a2(bytes2)) throw new Error('Uint8Array expected');
    return hexToNumber(bytesToHex(Uint8Array.from(bytes2).reverse()));
  }
  function numberToBytesBE(n, len) {
    return hexToBytes(n.toString(16).padStart(len * 2, '0'));
  }
  function numberToBytesLE(n, len) {
    return numberToBytesBE(n, len).reverse();
  }
  function numberToVarBytesBE(n) {
    return hexToBytes(numberToHexUnpadded(n));
  }
  function ensureBytes(title, hex, expectedLength) {
    let res;
    if (typeof hex === 'string') {
      try {
        res = hexToBytes(hex);
      } catch (e) {
        throw new Error(`${title} must be valid hex string, got "${hex}". Cause: ${e}`);
      }
    } else if (u8a2(hex)) {
      res = Uint8Array.from(hex);
    } else {
      throw new Error(`${title} must be hex string or Uint8Array`);
    }
    const len = res.length;
    if (typeof expectedLength === 'number' && len !== expectedLength)
      throw new Error(`${title} expected ${expectedLength} bytes, got ${len}`);
    return res;
  }
  function concatBytes(...arrays) {
    const r = new Uint8Array(arrays.reduce((sum, a) => sum + a.length, 0));
    let pad = 0;
    arrays.forEach(a => {
      if (!u8a2(a)) throw new Error('Uint8Array expected');
      r.set(a, pad);
      pad += a.length;
    });
    return r;
  }
  function equalBytes(b1, b2) {
    if (b1.length !== b2.length) return false;
    for (let i = 0; i < b1.length; i++) if (b1[i] !== b2[i]) return false;
    return true;
  }
  function utf8ToBytes2(str) {
    if (typeof str !== 'string') throw new Error(`utf8ToBytes expected string, got ${typeof str}`);
    return new Uint8Array(new TextEncoder().encode(str));
  }
  function bitLen(n) {
    let len;
    for (len = 0; n > _0n; n >>= _1n, len += 1);
    return len;
  }
  function bitGet(n, pos) {
    return (n >> BigInt(pos)) & _1n;
  }
  function createHmacDrbg(hashLen, qByteLen, hmacFn) {
    if (typeof hashLen !== 'number' || hashLen < 2) throw new Error('hashLen must be a number');
    if (typeof qByteLen !== 'number' || qByteLen < 2) throw new Error('qByteLen must be a number');
    if (typeof hmacFn !== 'function') throw new Error('hmacFn must be a function');
    let v = u8n(hashLen);
    let k = u8n(hashLen);
    let i = 0;
    const reset = () => {
      v.fill(1);
      k.fill(0);
      i = 0;
    };
    const h = (...b) => hmacFn(k, v, ...b);
    const reseed = (seed = u8n()) => {
      k = h(u8fr([0]), seed);
      v = h();
      if (seed.length === 0) return;
      k = h(u8fr([1]), seed);
      v = h();
    };
    const gen = () => {
      if (i++ >= 1e3) throw new Error('drbg: tried 1000 values');
      let len = 0;
      const out = [];
      while (len < qByteLen) {
        v = h();
        const sl = v.slice();
        out.push(sl);
        len += v.length;
      }
      return concatBytes(...out);
    };
    const genUntil = (seed, pred) => {
      reset();
      reseed(seed);
      let res = void 0;
      while (!(res = pred(gen()))) reseed();
      reset();
      return res;
    };
    return genUntil;
  }
  function validateObject(object, validators, optValidators = {}) {
    const checkField = (fieldName, type, isOptional) => {
      const checkVal = validatorFns[type];
      if (typeof checkVal !== 'function')
        throw new Error(`Invalid validator "${type}", expected function`);
      const val = object[fieldName];
      if (isOptional && val === void 0) return;
      if (!checkVal(val, object)) {
        throw new Error(
          `Invalid param ${String(fieldName)}=${val} (${typeof val}), expected ${type}`,
        );
      }
    };
    for (const [fieldName, type] of Object.entries(validators)) checkField(fieldName, type, false);
    for (const [fieldName, type] of Object.entries(optValidators))
      checkField(fieldName, type, true);
    return object;
  }
  var _0n, _1n, _2n, u8a2, hexes, asciis, bitSet, bitMask, u8n, u8fr, validatorFns;
  var init_utils2 = __esm({
    'node_modules/@noble/curves/esm/abstract/utils.js'() {
      _0n = BigInt(0);
      _1n = BigInt(1);
      _2n = BigInt(2);
      u8a2 = a => a instanceof Uint8Array;
      hexes = /* @__PURE__ */ Array.from({ length: 256 }, (_, i) =>
        i.toString(16).padStart(2, '0'),
      );
      asciis = { _0: 48, _9: 57, _A: 65, _F: 70, _a: 97, _f: 102 };
      bitSet = (n, pos, value) => {
        return n | ((value ? _1n : _0n) << BigInt(pos));
      };
      bitMask = n => (_2n << BigInt(n - 1)) - _1n;
      u8n = data => new Uint8Array(data);
      u8fr = arr => Uint8Array.from(arr);
      validatorFns = {
        bigint: val => typeof val === 'bigint',
        function: val => typeof val === 'function',
        boolean: val => typeof val === 'boolean',
        string: val => typeof val === 'string',
        stringOrUint8Array: val => typeof val === 'string' || val instanceof Uint8Array,
        isSafeInteger: val => Number.isSafeInteger(val),
        array: val => Array.isArray(val),
        field: (val, object) => object.Fp.isValid(val),
        hash: val => typeof val === 'function' && Number.isSafeInteger(val.outputLen),
      };
    },
  });

  // node_modules/@noble/curves/esm/abstract/modular.js
  function mod(a, b) {
    const result = a % b;
    return result >= _0n2 ? result : b + result;
  }
  function pow(num, power, modulo) {
    if (modulo <= _0n2 || power < _0n2) throw new Error('Expected power/modulo > 0');
    if (modulo === _1n2) return _0n2;
    let res = _1n2;
    while (power > _0n2) {
      if (power & _1n2) res = (res * num) % modulo;
      num = (num * num) % modulo;
      power >>= _1n2;
    }
    return res;
  }
  function invert(number, modulo) {
    if (number === _0n2 || modulo <= _0n2) {
      throw new Error(`invert: expected positive integers, got n=${number} mod=${modulo}`);
    }
    let a = mod(number, modulo);
    let b = modulo;
    let x = _0n2,
      y = _1n2,
      u = _1n2,
      v = _0n2;
    while (a !== _0n2) {
      const q = b / a;
      const r = b % a;
      const m = x - u * q;
      const n = y - v * q;
      (b = a), (a = r), (x = u), (y = v), (u = m), (v = n);
    }
    const gcd = b;
    if (gcd !== _1n2) throw new Error('invert: does not exist');
    return mod(x, modulo);
  }
  function tonelliShanks(P) {
    const legendreC = (P - _1n2) / _2n2;
    let Q, S, Z;
    for (Q = P - _1n2, S = 0; Q % _2n2 === _0n2; Q /= _2n2, S++);
    for (Z = _2n2; Z < P && pow(Z, legendreC, P) !== P - _1n2; Z++);
    if (S === 1) {
      const p1div4 = (P + _1n2) / _4n;
      return function tonelliFast(Fp3, n) {
        const root = Fp3.pow(n, p1div4);
        if (!Fp3.eql(Fp3.sqr(root), n)) throw new Error('Cannot find square root');
        return root;
      };
    }
    const Q1div2 = (Q + _1n2) / _2n2;
    return function tonelliSlow(Fp3, n) {
      if (Fp3.pow(n, legendreC) === Fp3.neg(Fp3.ONE)) throw new Error('Cannot find square root');
      let r = S;
      let g = Fp3.pow(Fp3.mul(Fp3.ONE, Z), Q);
      let x = Fp3.pow(n, Q1div2);
      let b = Fp3.pow(n, Q);
      while (!Fp3.eql(b, Fp3.ONE)) {
        if (Fp3.eql(b, Fp3.ZERO)) return Fp3.ZERO;
        let m = 1;
        for (let t2 = Fp3.sqr(b); m < r; m++) {
          if (Fp3.eql(t2, Fp3.ONE)) break;
          t2 = Fp3.sqr(t2);
        }
        const ge = Fp3.pow(g, _1n2 << BigInt(r - m - 1));
        g = Fp3.sqr(ge);
        x = Fp3.mul(x, ge);
        b = Fp3.mul(b, g);
        r = m;
      }
      return x;
    };
  }
  function FpSqrt(P) {
    if (P % _4n === _3n) {
      const p1div4 = (P + _1n2) / _4n;
      return function sqrt3mod4(Fp3, n) {
        const root = Fp3.pow(n, p1div4);
        if (!Fp3.eql(Fp3.sqr(root), n)) throw new Error('Cannot find square root');
        return root;
      };
    }
    if (P % _8n === _5n) {
      const c1 = (P - _5n) / _8n;
      return function sqrt5mod8(Fp3, n) {
        const n2 = Fp3.mul(n, _2n2);
        const v = Fp3.pow(n2, c1);
        const nv = Fp3.mul(n, v);
        const i = Fp3.mul(Fp3.mul(nv, _2n2), v);
        const root = Fp3.mul(nv, Fp3.sub(i, Fp3.ONE));
        if (!Fp3.eql(Fp3.sqr(root), n)) throw new Error('Cannot find square root');
        return root;
      };
    }
    if (P % _16n === _9n) {
    }
    return tonelliShanks(P);
  }
  function validateField(field) {
    const initial = {
      ORDER: 'bigint',
      MASK: 'bigint',
      BYTES: 'isSafeInteger',
      BITS: 'isSafeInteger',
    };
    const opts = FIELD_FIELDS.reduce((map, val) => {
      map[val] = 'function';
      return map;
    }, initial);
    return validateObject(field, opts);
  }
  function FpPow(f, num, power) {
    if (power < _0n2) throw new Error('Expected power > 0');
    if (power === _0n2) return f.ONE;
    if (power === _1n2) return num;
    let p = f.ONE;
    let d = num;
    while (power > _0n2) {
      if (power & _1n2) p = f.mul(p, d);
      d = f.sqr(d);
      power >>= _1n2;
    }
    return p;
  }
  function FpInvertBatch(f, nums) {
    const tmp = new Array(nums.length);
    const lastMultiplied = nums.reduce((acc, num, i) => {
      if (f.is0(num)) return acc;
      tmp[i] = acc;
      return f.mul(acc, num);
    }, f.ONE);
    const inverted = f.inv(lastMultiplied);
    nums.reduceRight((acc, num, i) => {
      if (f.is0(num)) return acc;
      tmp[i] = f.mul(acc, tmp[i]);
      return f.mul(acc, num);
    }, inverted);
    return tmp;
  }
  function nLength(n, nBitLength) {
    const _nBitLength = nBitLength !== void 0 ? nBitLength : n.toString(2).length;
    const nByteLength = Math.ceil(_nBitLength / 8);
    return { nBitLength: _nBitLength, nByteLength };
  }
  function Field(ORDER, bitLen2, isLE2 = false, redef = {}) {
    if (ORDER <= _0n2) throw new Error(`Expected Field ORDER > 0, got ${ORDER}`);
    const { nBitLength: BITS, nByteLength: BYTES } = nLength(ORDER, bitLen2);
    if (BYTES > 2048) throw new Error('Field lengths over 2048 bytes are not supported');
    const sqrtP = FpSqrt(ORDER);
    const f = Object.freeze({
      ORDER,
      BITS,
      BYTES,
      MASK: bitMask(BITS),
      ZERO: _0n2,
      ONE: _1n2,
      create: num => mod(num, ORDER),
      isValid: num => {
        if (typeof num !== 'bigint')
          throw new Error(`Invalid field element: expected bigint, got ${typeof num}`);
        return _0n2 <= num && num < ORDER;
      },
      is0: num => num === _0n2,
      isOdd: num => (num & _1n2) === _1n2,
      neg: num => mod(-num, ORDER),
      eql: (lhs, rhs) => lhs === rhs,
      sqr: num => mod(num * num, ORDER),
      add: (lhs, rhs) => mod(lhs + rhs, ORDER),
      sub: (lhs, rhs) => mod(lhs - rhs, ORDER),
      mul: (lhs, rhs) => mod(lhs * rhs, ORDER),
      pow: (num, power) => FpPow(f, num, power),
      div: (lhs, rhs) => mod(lhs * invert(rhs, ORDER), ORDER),
      // Same as above, but doesn't normalize
      sqrN: num => num * num,
      addN: (lhs, rhs) => lhs + rhs,
      subN: (lhs, rhs) => lhs - rhs,
      mulN: (lhs, rhs) => lhs * rhs,
      inv: num => invert(num, ORDER),
      sqrt: redef.sqrt || (n => sqrtP(f, n)),
      invertBatch: lst => FpInvertBatch(f, lst),
      // TODO: do we really need constant cmov?
      // We don't have const-time bigints anyway, so probably will be not very useful
      cmov: (a, b, c) => (c ? b : a),
      toBytes: num => (isLE2 ? numberToBytesLE(num, BYTES) : numberToBytesBE(num, BYTES)),
      fromBytes: bytes2 => {
        if (bytes2.length !== BYTES)
          throw new Error(`Fp.fromBytes: expected ${BYTES}, got ${bytes2.length}`);
        return isLE2 ? bytesToNumberLE(bytes2) : bytesToNumberBE(bytes2);
      },
    });
    return Object.freeze(f);
  }
  function getFieldBytesLength(fieldOrder) {
    if (typeof fieldOrder !== 'bigint') throw new Error('field order must be bigint');
    const bitLength = fieldOrder.toString(2).length;
    return Math.ceil(bitLength / 8);
  }
  function getMinHashLength(fieldOrder) {
    const length = getFieldBytesLength(fieldOrder);
    return length + Math.ceil(length / 2);
  }
  function mapHashToField(key, fieldOrder, isLE2 = false) {
    const len = key.length;
    const fieldLen = getFieldBytesLength(fieldOrder);
    const minLen = getMinHashLength(fieldOrder);
    if (len < 16 || len < minLen || len > 1024)
      throw new Error(`expected ${minLen}-1024 bytes of input, got ${len}`);
    const num = isLE2 ? bytesToNumberBE(key) : bytesToNumberLE(key);
    const reduced = mod(num, fieldOrder - _1n2) + _1n2;
    return isLE2 ? numberToBytesLE(reduced, fieldLen) : numberToBytesBE(reduced, fieldLen);
  }
  var _0n2, _1n2, _2n2, _3n, _4n, _5n, _8n, _9n, _16n, FIELD_FIELDS;
  var init_modular = __esm({
    'node_modules/@noble/curves/esm/abstract/modular.js'() {
      init_utils2();
      _0n2 = BigInt(0);
      _1n2 = BigInt(1);
      _2n2 = BigInt(2);
      _3n = BigInt(3);
      _4n = BigInt(4);
      _5n = BigInt(5);
      _8n = BigInt(8);
      _9n = BigInt(9);
      _16n = BigInt(16);
      FIELD_FIELDS = [
        'create',
        'isValid',
        'is0',
        'neg',
        'inv',
        'sqrt',
        'sqr',
        'eql',
        'add',
        'sub',
        'mul',
        'pow',
        'div',
        'addN',
        'subN',
        'mulN',
        'sqrN',
      ];
    },
  });

  // node_modules/@noble/curves/esm/abstract/hash-to-curve.js
  function validateDST(dst) {
    if (dst instanceof Uint8Array) return dst;
    if (typeof dst === 'string') return utf8ToBytes2(dst);
    throw new Error('DST must be Uint8Array or string');
  }
  function i2osp(value, length) {
    if (value < 0 || value >= 1 << (8 * length)) {
      throw new Error(`bad I2OSP call: value=${value} length=${length}`);
    }
    const res = Array.from({ length }).fill(0);
    for (let i = length - 1; i >= 0; i--) {
      res[i] = value & 255;
      value >>>= 8;
    }
    return new Uint8Array(res);
  }
  function strxor(a, b) {
    const arr = new Uint8Array(a.length);
    for (let i = 0; i < a.length; i++) {
      arr[i] = a[i] ^ b[i];
    }
    return arr;
  }
  function isBytes(item) {
    if (!(item instanceof Uint8Array)) throw new Error('Uint8Array expected');
  }
  function isNum(item) {
    if (!Number.isSafeInteger(item)) throw new Error('number expected');
  }
  function expand_message_xmd(msg, DST, lenInBytes, H) {
    isBytes(msg);
    isBytes(DST);
    isNum(lenInBytes);
    if (DST.length > 255) DST = H(concatBytes(utf8ToBytes2('H2C-OVERSIZE-DST-'), DST));
    const { outputLen: b_in_bytes, blockLen: r_in_bytes } = H;
    const ell = Math.ceil(lenInBytes / b_in_bytes);
    if (ell > 255) throw new Error('Invalid xmd length');
    const DST_prime = concatBytes(DST, i2osp(DST.length, 1));
    const Z_pad = i2osp(0, r_in_bytes);
    const l_i_b_str = i2osp(lenInBytes, 2);
    const b = new Array(ell);
    const b_0 = H(concatBytes(Z_pad, msg, l_i_b_str, i2osp(0, 1), DST_prime));
    b[0] = H(concatBytes(b_0, i2osp(1, 1), DST_prime));
    for (let i = 1; i <= ell; i++) {
      const args = [strxor(b_0, b[i - 1]), i2osp(i + 1, 1), DST_prime];
      b[i] = H(concatBytes(...args));
    }
    const pseudo_random_bytes = concatBytes(...b);
    return pseudo_random_bytes.slice(0, lenInBytes);
  }
  function expand_message_xof(msg, DST, lenInBytes, k, H) {
    isBytes(msg);
    isBytes(DST);
    isNum(lenInBytes);
    if (DST.length > 255) {
      const dkLen = Math.ceil((2 * k) / 8);
      DST = H.create({ dkLen }).update(utf8ToBytes2('H2C-OVERSIZE-DST-')).update(DST).digest();
    }
    if (lenInBytes > 65535 || DST.length > 255)
      throw new Error('expand_message_xof: invalid lenInBytes');
    return H.create({ dkLen: lenInBytes })
      .update(msg)
      .update(i2osp(lenInBytes, 2))
      .update(DST)
      .update(i2osp(DST.length, 1))
      .digest();
  }
  function hash_to_field(msg, count, options) {
    validateObject(options, {
      DST: 'stringOrUint8Array',
      p: 'bigint',
      m: 'isSafeInteger',
      k: 'isSafeInteger',
      hash: 'hash',
    });
    const { p, k, m, hash, expand, DST: _DST } = options;
    isBytes(msg);
    isNum(count);
    const DST = validateDST(_DST);
    const log2p = p.toString(2).length;
    const L = Math.ceil((log2p + k) / 8);
    const len_in_bytes = count * m * L;
    let prb;
    if (expand === 'xmd') {
      prb = expand_message_xmd(msg, DST, len_in_bytes, hash);
    } else if (expand === 'xof') {
      prb = expand_message_xof(msg, DST, len_in_bytes, k, hash);
    } else if (expand === '_internal_pass') {
      prb = msg;
    } else {
      throw new Error('expand must be "xmd" or "xof"');
    }
    const u = new Array(count);
    for (let i = 0; i < count; i++) {
      const e = new Array(m);
      for (let j = 0; j < m; j++) {
        const elm_offset = L * (j + i * m);
        const tv = prb.subarray(elm_offset, elm_offset + L);
        e[j] = mod(os2ip(tv), p);
      }
      u[i] = e;
    }
    return u;
  }
  function isogenyMap(field, map) {
    const COEFF = map.map(i => Array.from(i).reverse());
    return (x, y) => {
      const [xNum, xDen, yNum, yDen] = COEFF.map(val =>
        val.reduce((acc, i) => field.add(field.mul(acc, x), i)),
      );
      x = field.div(xNum, xDen);
      y = field.mul(y, field.div(yNum, yDen));
      return { x, y };
    };
  }
  function createHasher(Point, mapToCurve, def) {
    if (typeof mapToCurve !== 'function') throw new Error('mapToCurve() must be defined');
    return {
      // Encodes byte string to elliptic curve.
      // hash_to_curve from https://www.rfc-editor.org/rfc/rfc9380#section-3
      hashToCurve(msg, options) {
        const u = hash_to_field(msg, 2, { ...def, DST: def.DST, ...options });
        const u0 = Point.fromAffine(mapToCurve(u[0]));
        const u1 = Point.fromAffine(mapToCurve(u[1]));
        const P = u0.add(u1).clearCofactor();
        P.assertValidity();
        return P;
      },
      // Encodes byte string to elliptic curve.
      // encode_to_curve from https://www.rfc-editor.org/rfc/rfc9380#section-3
      encodeToCurve(msg, options) {
        const u = hash_to_field(msg, 1, { ...def, DST: def.encodeDST, ...options });
        const P = Point.fromAffine(mapToCurve(u[0])).clearCofactor();
        P.assertValidity();
        return P;
      },
    };
  }
  var os2ip;
  var init_hash_to_curve = __esm({
    'node_modules/@noble/curves/esm/abstract/hash-to-curve.js'() {
      init_modular();
      init_utils2();
      os2ip = bytesToNumberBE;
    },
  });

  // node_modules/@noble/curves/esm/abstract/curve.js
  function wNAF(c, bits) {
    const constTimeNegate = (condition, item) => {
      const neg = item.negate();
      return condition ? neg : item;
    };
    const opts = W => {
      const windows = Math.ceil(bits / W) + 1;
      const windowSize = 2 ** (W - 1);
      return { windows, windowSize };
    };
    return {
      constTimeNegate,
      // non-const time multiplication ladder
      unsafeLadder(elm, n) {
        let p = c.ZERO;
        let d = elm;
        while (n > _0n3) {
          if (n & _1n3) p = p.add(d);
          d = d.double();
          n >>= _1n3;
        }
        return p;
      },
      /**
       * Creates a wNAF precomputation window. Used for caching.
       * Default window size is set by `utils.precompute()` and is equal to 8.
       * Number of precomputed points depends on the curve size:
       * 2^(𝑊−1) * (Math.ceil(𝑛 / 𝑊) + 1), where:
       * - 𝑊 is the window size
       * - 𝑛 is the bitlength of the curve order.
       * For a 256-bit curve and window size 8, the number of precomputed points is 128 * 33 = 4224.
       * @returns precomputed point tables flattened to a single array
       */
      precomputeWindow(elm, W) {
        const { windows, windowSize } = opts(W);
        const points = [];
        let p = elm;
        let base = p;
        for (let window = 0; window < windows; window++) {
          base = p;
          points.push(base);
          for (let i = 1; i < windowSize; i++) {
            base = base.add(p);
            points.push(base);
          }
          p = base.double();
        }
        return points;
      },
      /**
       * Implements ec multiplication using precomputed tables and w-ary non-adjacent form.
       * @param W window size
       * @param precomputes precomputed tables
       * @param n scalar (we don't check here, but should be less than curve order)
       * @returns real and fake (for const-time) points
       */
      wNAF(W, precomputes, n) {
        const { windows, windowSize } = opts(W);
        let p = c.ZERO;
        let f = c.BASE;
        const mask = BigInt(2 ** W - 1);
        const maxNumber = 2 ** W;
        const shiftBy = BigInt(W);
        for (let window = 0; window < windows; window++) {
          const offset = window * windowSize;
          let wbits = Number(n & mask);
          n >>= shiftBy;
          if (wbits > windowSize) {
            wbits -= maxNumber;
            n += _1n3;
          }
          const offset1 = offset;
          const offset2 = offset + Math.abs(wbits) - 1;
          const cond1 = window % 2 !== 0;
          const cond2 = wbits < 0;
          if (wbits === 0) {
            f = f.add(constTimeNegate(cond1, precomputes[offset1]));
          } else {
            p = p.add(constTimeNegate(cond2, precomputes[offset2]));
          }
        }
        return { p, f };
      },
      wNAFCached(P, precomputesMap, n, transform) {
        const W = P._WINDOW_SIZE || 1;
        let comp = precomputesMap.get(P);
        if (!comp) {
          comp = this.precomputeWindow(P, W);
          if (W !== 1) {
            precomputesMap.set(P, transform(comp));
          }
        }
        return this.wNAF(W, comp, n);
      },
    };
  }
  function validateBasic(curve) {
    validateField(curve.Fp);
    validateObject(
      curve,
      {
        n: 'bigint',
        h: 'bigint',
        Gx: 'field',
        Gy: 'field',
      },
      {
        nBitLength: 'isSafeInteger',
        nByteLength: 'isSafeInteger',
      },
    );
    return Object.freeze({
      ...nLength(curve.n, curve.nBitLength),
      ...curve,
      ...{ p: curve.Fp.ORDER },
    });
  }
  var _0n3, _1n3;
  var init_curve = __esm({
    'node_modules/@noble/curves/esm/abstract/curve.js'() {
      init_modular();
      init_utils2();
      _0n3 = BigInt(0);
      _1n3 = BigInt(1);
    },
  });

  // node_modules/@noble/curves/esm/abstract/weierstrass.js
  function validatePointOpts(curve) {
    const opts = validateBasic(curve);
    validateObject(
      opts,
      {
        a: 'field',
        b: 'field',
      },
      {
        allowedPrivateKeyLengths: 'array',
        wrapPrivateKey: 'boolean',
        isTorsionFree: 'function',
        clearCofactor: 'function',
        allowInfinityPoint: 'boolean',
        fromBytes: 'function',
        toBytes: 'function',
      },
    );
    const { endo, Fp: Fp3, a } = opts;
    if (endo) {
      if (!Fp3.eql(a, Fp3.ZERO)) {
        throw new Error('Endomorphism can only be defined for Koblitz curves that have a=0');
      }
      if (
        typeof endo !== 'object' ||
        typeof endo.beta !== 'bigint' ||
        typeof endo.splitScalar !== 'function'
      ) {
        throw new Error('Expected endomorphism with beta: bigint and splitScalar: function');
      }
    }
    return Object.freeze({ ...opts });
  }
  function weierstrassPoints(opts) {
    const CURVE = validatePointOpts(opts);
    const { Fp: Fp3 } = CURVE;
    const toBytes2 =
      CURVE.toBytes ||
      ((_c, point, _isCompressed) => {
        const a = point.toAffine();
        return concatBytes(Uint8Array.from([4]), Fp3.toBytes(a.x), Fp3.toBytes(a.y));
      });
    const fromBytes =
      CURVE.fromBytes ||
      (bytes2 => {
        const tail = bytes2.subarray(1);
        const x = Fp3.fromBytes(tail.subarray(0, Fp3.BYTES));
        const y = Fp3.fromBytes(tail.subarray(Fp3.BYTES, 2 * Fp3.BYTES));
        return { x, y };
      });
    function weierstrassEquation(x) {
      const { a, b } = CURVE;
      const x2 = Fp3.sqr(x);
      const x3 = Fp3.mul(x2, x);
      return Fp3.add(Fp3.add(x3, Fp3.mul(x, a)), b);
    }
    if (!Fp3.eql(Fp3.sqr(CURVE.Gy), weierstrassEquation(CURVE.Gx)))
      throw new Error('bad generator point: equation left != right');
    function isWithinCurveOrder(num) {
      return typeof num === 'bigint' && _0n4 < num && num < CURVE.n;
    }
    function assertGE(num) {
      if (!isWithinCurveOrder(num)) throw new Error('Expected valid bigint: 0 < bigint < curve.n');
    }
    function normPrivateKeyToScalar(key) {
      const { allowedPrivateKeyLengths: lengths, nByteLength, wrapPrivateKey, n } = CURVE;
      if (lengths && typeof key !== 'bigint') {
        if (key instanceof Uint8Array) key = bytesToHex(key);
        if (typeof key !== 'string' || !lengths.includes(key.length))
          throw new Error('Invalid key');
        key = key.padStart(nByteLength * 2, '0');
      }
      let num;
      try {
        num =
          typeof key === 'bigint'
            ? key
            : bytesToNumberBE(ensureBytes('private key', key, nByteLength));
      } catch (error) {
        throw new Error(
          `private key must be ${nByteLength} bytes, hex or bigint, not ${typeof key}`,
        );
      }
      if (wrapPrivateKey) num = mod(num, n);
      assertGE(num);
      return num;
    }
    const pointPrecomputes = /* @__PURE__ */ new Map();
    function assertPrjPoint(other) {
      if (!(other instanceof Point)) throw new Error('ProjectivePoint expected');
    }
    class Point {
      constructor(px, py, pz) {
        this.px = px;
        this.py = py;
        this.pz = pz;
        if (px == null || !Fp3.isValid(px)) throw new Error('x required');
        if (py == null || !Fp3.isValid(py)) throw new Error('y required');
        if (pz == null || !Fp3.isValid(pz)) throw new Error('z required');
      }
      // Does not validate if the point is on-curve.
      // Use fromHex instead, or call assertValidity() later.
      static fromAffine(p) {
        const { x, y } = p || {};
        if (!p || !Fp3.isValid(x) || !Fp3.isValid(y)) throw new Error('invalid affine point');
        if (p instanceof Point) throw new Error('projective point not allowed');
        const is0 = i => Fp3.eql(i, Fp3.ZERO);
        if (is0(x) && is0(y)) return Point.ZERO;
        return new Point(x, y, Fp3.ONE);
      }
      get x() {
        return this.toAffine().x;
      }
      get y() {
        return this.toAffine().y;
      }
      /**
       * Takes a bunch of Projective Points but executes only one
       * inversion on all of them. Inversion is very slow operation,
       * so this improves performance massively.
       * Optimization: converts a list of projective points to a list of identical points with Z=1.
       */
      static normalizeZ(points) {
        const toInv = Fp3.invertBatch(points.map(p => p.pz));
        return points.map((p, i) => p.toAffine(toInv[i])).map(Point.fromAffine);
      }
      /**
       * Converts hash string or Uint8Array to Point.
       * @param hex short/long ECDSA hex
       */
      static fromHex(hex) {
        const P = Point.fromAffine(fromBytes(ensureBytes('pointHex', hex)));
        P.assertValidity();
        return P;
      }
      // Multiplies generator point by privateKey.
      static fromPrivateKey(privateKey) {
        return Point.BASE.multiply(normPrivateKeyToScalar(privateKey));
      }
      // "Private method", don't use it directly
      _setWindowSize(windowSize) {
        this._WINDOW_SIZE = windowSize;
        pointPrecomputes.delete(this);
      }
      // A point on curve is valid if it conforms to equation.
      assertValidity() {
        if (this.is0()) {
          if (CURVE.allowInfinityPoint && !Fp3.is0(this.py)) return;
          throw new Error('bad point: ZERO');
        }
        const { x, y } = this.toAffine();
        if (!Fp3.isValid(x) || !Fp3.isValid(y)) throw new Error('bad point: x or y not FE');
        const left = Fp3.sqr(y);
        const right = weierstrassEquation(x);
        if (!Fp3.eql(left, right)) throw new Error('bad point: equation left != right');
        if (!this.isTorsionFree()) throw new Error('bad point: not in prime-order subgroup');
      }
      hasEvenY() {
        const { y } = this.toAffine();
        if (Fp3.isOdd) return !Fp3.isOdd(y);
        throw new Error("Field doesn't support isOdd");
      }
      /**
       * Compare one point to another.
       */
      equals(other) {
        assertPrjPoint(other);
        const { px: X1, py: Y1, pz: Z1 } = this;
        const { px: X2, py: Y2, pz: Z2 } = other;
        const U1 = Fp3.eql(Fp3.mul(X1, Z2), Fp3.mul(X2, Z1));
        const U2 = Fp3.eql(Fp3.mul(Y1, Z2), Fp3.mul(Y2, Z1));
        return U1 && U2;
      }
      /**
       * Flips point to one corresponding to (x, -y) in Affine coordinates.
       */
      negate() {
        return new Point(this.px, Fp3.neg(this.py), this.pz);
      }
      // Renes-Costello-Batina exception-free doubling formula.
      // There is 30% faster Jacobian formula, but it is not complete.
      // https://eprint.iacr.org/2015/1060, algorithm 3
      // Cost: 8M + 3S + 3*a + 2*b3 + 15add.
      double() {
        const { a, b } = CURVE;
        const b3 = Fp3.mul(b, _3n2);
        const { px: X1, py: Y1, pz: Z1 } = this;
        let X3 = Fp3.ZERO,
          Y3 = Fp3.ZERO,
          Z3 = Fp3.ZERO;
        let t0 = Fp3.mul(X1, X1);
        let t1 = Fp3.mul(Y1, Y1);
        let t2 = Fp3.mul(Z1, Z1);
        let t3 = Fp3.mul(X1, Y1);
        t3 = Fp3.add(t3, t3);
        Z3 = Fp3.mul(X1, Z1);
        Z3 = Fp3.add(Z3, Z3);
        X3 = Fp3.mul(a, Z3);
        Y3 = Fp3.mul(b3, t2);
        Y3 = Fp3.add(X3, Y3);
        X3 = Fp3.sub(t1, Y3);
        Y3 = Fp3.add(t1, Y3);
        Y3 = Fp3.mul(X3, Y3);
        X3 = Fp3.mul(t3, X3);
        Z3 = Fp3.mul(b3, Z3);
        t2 = Fp3.mul(a, t2);
        t3 = Fp3.sub(t0, t2);
        t3 = Fp3.mul(a, t3);
        t3 = Fp3.add(t3, Z3);
        Z3 = Fp3.add(t0, t0);
        t0 = Fp3.add(Z3, t0);
        t0 = Fp3.add(t0, t2);
        t0 = Fp3.mul(t0, t3);
        Y3 = Fp3.add(Y3, t0);
        t2 = Fp3.mul(Y1, Z1);
        t2 = Fp3.add(t2, t2);
        t0 = Fp3.mul(t2, t3);
        X3 = Fp3.sub(X3, t0);
        Z3 = Fp3.mul(t2, t1);
        Z3 = Fp3.add(Z3, Z3);
        Z3 = Fp3.add(Z3, Z3);
        return new Point(X3, Y3, Z3);
      }
      // Renes-Costello-Batina exception-free addition formula.
      // There is 30% faster Jacobian formula, but it is not complete.
      // https://eprint.iacr.org/2015/1060, algorithm 1
      // Cost: 12M + 0S + 3*a + 3*b3 + 23add.
      add(other) {
        assertPrjPoint(other);
        const { px: X1, py: Y1, pz: Z1 } = this;
        const { px: X2, py: Y2, pz: Z2 } = other;
        let X3 = Fp3.ZERO,
          Y3 = Fp3.ZERO,
          Z3 = Fp3.ZERO;
        const a = CURVE.a;
        const b3 = Fp3.mul(CURVE.b, _3n2);
        let t0 = Fp3.mul(X1, X2);
        let t1 = Fp3.mul(Y1, Y2);
        let t2 = Fp3.mul(Z1, Z2);
        let t3 = Fp3.add(X1, Y1);
        let t4 = Fp3.add(X2, Y2);
        t3 = Fp3.mul(t3, t4);
        t4 = Fp3.add(t0, t1);
        t3 = Fp3.sub(t3, t4);
        t4 = Fp3.add(X1, Z1);
        let t5 = Fp3.add(X2, Z2);
        t4 = Fp3.mul(t4, t5);
        t5 = Fp3.add(t0, t2);
        t4 = Fp3.sub(t4, t5);
        t5 = Fp3.add(Y1, Z1);
        X3 = Fp3.add(Y2, Z2);
        t5 = Fp3.mul(t5, X3);
        X3 = Fp3.add(t1, t2);
        t5 = Fp3.sub(t5, X3);
        Z3 = Fp3.mul(a, t4);
        X3 = Fp3.mul(b3, t2);
        Z3 = Fp3.add(X3, Z3);
        X3 = Fp3.sub(t1, Z3);
        Z3 = Fp3.add(t1, Z3);
        Y3 = Fp3.mul(X3, Z3);
        t1 = Fp3.add(t0, t0);
        t1 = Fp3.add(t1, t0);
        t2 = Fp3.mul(a, t2);
        t4 = Fp3.mul(b3, t4);
        t1 = Fp3.add(t1, t2);
        t2 = Fp3.sub(t0, t2);
        t2 = Fp3.mul(a, t2);
        t4 = Fp3.add(t4, t2);
        t0 = Fp3.mul(t1, t4);
        Y3 = Fp3.add(Y3, t0);
        t0 = Fp3.mul(t5, t4);
        X3 = Fp3.mul(t3, X3);
        X3 = Fp3.sub(X3, t0);
        t0 = Fp3.mul(t3, t1);
        Z3 = Fp3.mul(t5, Z3);
        Z3 = Fp3.add(Z3, t0);
        return new Point(X3, Y3, Z3);
      }
      subtract(other) {
        return this.add(other.negate());
      }
      is0() {
        return this.equals(Point.ZERO);
      }
      wNAF(n) {
        return wnaf.wNAFCached(this, pointPrecomputes, n, comp => {
          const toInv = Fp3.invertBatch(comp.map(p => p.pz));
          return comp.map((p, i) => p.toAffine(toInv[i])).map(Point.fromAffine);
        });
      }
      /**
       * Non-constant-time multiplication. Uses double-and-add algorithm.
       * It's faster, but should only be used when you don't care about
       * an exposed private key e.g. sig verification, which works over *public* keys.
       */
      multiplyUnsafe(n) {
        const I = Point.ZERO;
        if (n === _0n4) return I;
        assertGE(n);
        if (n === _1n4) return this;
        const { endo } = CURVE;
        if (!endo) return wnaf.unsafeLadder(this, n);
        let { k1neg, k1, k2neg, k2 } = endo.splitScalar(n);
        let k1p = I;
        let k2p = I;
        let d = this;
        while (k1 > _0n4 || k2 > _0n4) {
          if (k1 & _1n4) k1p = k1p.add(d);
          if (k2 & _1n4) k2p = k2p.add(d);
          d = d.double();
          k1 >>= _1n4;
          k2 >>= _1n4;
        }
        if (k1neg) k1p = k1p.negate();
        if (k2neg) k2p = k2p.negate();
        k2p = new Point(Fp3.mul(k2p.px, endo.beta), k2p.py, k2p.pz);
        return k1p.add(k2p);
      }
      /**
       * Constant time multiplication.
       * Uses wNAF method. Windowed method may be 10% faster,
       * but takes 2x longer to generate and consumes 2x memory.
       * Uses precomputes when available.
       * Uses endomorphism for Koblitz curves.
       * @param scalar by which the point would be multiplied
       * @returns New point
       */
      multiply(scalar) {
        assertGE(scalar);
        let n = scalar;
        let point, fake;
        const { endo } = CURVE;
        if (endo) {
          const { k1neg, k1, k2neg, k2 } = endo.splitScalar(n);
          let { p: k1p, f: f1p } = this.wNAF(k1);
          let { p: k2p, f: f2p } = this.wNAF(k2);
          k1p = wnaf.constTimeNegate(k1neg, k1p);
          k2p = wnaf.constTimeNegate(k2neg, k2p);
          k2p = new Point(Fp3.mul(k2p.px, endo.beta), k2p.py, k2p.pz);
          point = k1p.add(k2p);
          fake = f1p.add(f2p);
        } else {
          const { p, f } = this.wNAF(n);
          point = p;
          fake = f;
        }
        return Point.normalizeZ([point, fake])[0];
      }
      /**
       * Efficiently calculate `aP + bQ`. Unsafe, can expose private key, if used incorrectly.
       * Not using Strauss-Shamir trick: precomputation tables are faster.
       * The trick could be useful if both P and Q are not G (not in our case).
       * @returns non-zero affine point
       */
      multiplyAndAddUnsafe(Q, a, b) {
        const G = Point.BASE;
        const mul = (P, a2) =>
          a2 === _0n4 || a2 === _1n4 || !P.equals(G) ? P.multiplyUnsafe(a2) : P.multiply(a2);
        const sum = mul(this, a).add(mul(Q, b));
        return sum.is0() ? void 0 : sum;
      }
      // Converts Projective point to affine (x, y) coordinates.
      // Can accept precomputed Z^-1 - for example, from invertBatch.
      // (x, y, z) ∋ (x=x/z, y=y/z)
      toAffine(iz) {
        const { px: x, py: y, pz: z } = this;
        const is0 = this.is0();
        if (iz == null) iz = is0 ? Fp3.ONE : Fp3.inv(z);
        const ax = Fp3.mul(x, iz);
        const ay = Fp3.mul(y, iz);
        const zz = Fp3.mul(z, iz);
        if (is0) return { x: Fp3.ZERO, y: Fp3.ZERO };
        if (!Fp3.eql(zz, Fp3.ONE)) throw new Error('invZ was invalid');
        return { x: ax, y: ay };
      }
      isTorsionFree() {
        const { h: cofactor, isTorsionFree } = CURVE;
        if (cofactor === _1n4) return true;
        if (isTorsionFree) return isTorsionFree(Point, this);
        throw new Error('isTorsionFree() has not been declared for the elliptic curve');
      }
      clearCofactor() {
        const { h: cofactor, clearCofactor } = CURVE;
        if (cofactor === _1n4) return this;
        if (clearCofactor) return clearCofactor(Point, this);
        return this.multiplyUnsafe(CURVE.h);
      }
      toRawBytes(isCompressed = true) {
        this.assertValidity();
        return toBytes2(Point, this, isCompressed);
      }
      toHex(isCompressed = true) {
        return bytesToHex(this.toRawBytes(isCompressed));
      }
    }
    Point.BASE = new Point(CURVE.Gx, CURVE.Gy, Fp3.ONE);
    Point.ZERO = new Point(Fp3.ZERO, Fp3.ONE, Fp3.ZERO);
    const _bits = CURVE.nBitLength;
    const wnaf = wNAF(Point, CURVE.endo ? Math.ceil(_bits / 2) : _bits);
    return {
      CURVE,
      ProjectivePoint: Point,
      normPrivateKeyToScalar,
      weierstrassEquation,
      isWithinCurveOrder,
    };
  }
  function SWUFpSqrtRatio(Fp3, Z) {
    const q = Fp3.ORDER;
    let l = _0n4;
    for (let o = q - _1n4; o % _2n3 === _0n4; o /= _2n3) l += _1n4;
    const c1 = l;
    const _2n_pow_c1_1 = _2n3 << (c1 - _1n4 - _1n4);
    const _2n_pow_c1 = _2n_pow_c1_1 * _2n3;
    const c2 = (q - _1n4) / _2n_pow_c1;
    const c3 = (c2 - _1n4) / _2n3;
    const c4 = _2n_pow_c1 - _1n4;
    const c5 = _2n_pow_c1_1;
    const c6 = Fp3.pow(Z, c2);
    const c7 = Fp3.pow(Z, (c2 + _1n4) / _2n3);
    let sqrtRatio = (u, v) => {
      let tv1 = c6;
      let tv2 = Fp3.pow(v, c4);
      let tv3 = Fp3.sqr(tv2);
      tv3 = Fp3.mul(tv3, v);
      let tv5 = Fp3.mul(u, tv3);
      tv5 = Fp3.pow(tv5, c3);
      tv5 = Fp3.mul(tv5, tv2);
      tv2 = Fp3.mul(tv5, v);
      tv3 = Fp3.mul(tv5, u);
      let tv4 = Fp3.mul(tv3, tv2);
      tv5 = Fp3.pow(tv4, c5);
      let isQR = Fp3.eql(tv5, Fp3.ONE);
      tv2 = Fp3.mul(tv3, c7);
      tv5 = Fp3.mul(tv4, tv1);
      tv3 = Fp3.cmov(tv2, tv3, isQR);
      tv4 = Fp3.cmov(tv5, tv4, isQR);
      for (let i = c1; i > _1n4; i--) {
        let tv52 = i - _2n3;
        tv52 = _2n3 << (tv52 - _1n4);
        let tvv5 = Fp3.pow(tv4, tv52);
        const e1 = Fp3.eql(tvv5, Fp3.ONE);
        tv2 = Fp3.mul(tv3, tv1);
        tv1 = Fp3.mul(tv1, tv1);
        tvv5 = Fp3.mul(tv4, tv1);
        tv3 = Fp3.cmov(tv2, tv3, e1);
        tv4 = Fp3.cmov(tvv5, tv4, e1);
      }
      return { isValid: isQR, value: tv3 };
    };
    if (Fp3.ORDER % _4n2 === _3n2) {
      const c12 = (Fp3.ORDER - _3n2) / _4n2;
      const c22 = Fp3.sqrt(Fp3.neg(Z));
      sqrtRatio = (u, v) => {
        let tv1 = Fp3.sqr(v);
        const tv2 = Fp3.mul(u, v);
        tv1 = Fp3.mul(tv1, tv2);
        let y1 = Fp3.pow(tv1, c12);
        y1 = Fp3.mul(y1, tv2);
        const y2 = Fp3.mul(y1, c22);
        const tv3 = Fp3.mul(Fp3.sqr(y1), v);
        const isQR = Fp3.eql(tv3, u);
        let y = Fp3.cmov(y2, y1, isQR);
        return { isValid: isQR, value: y };
      };
    }
    return sqrtRatio;
  }
  function mapToCurveSimpleSWU(Fp3, opts) {
    validateField(Fp3);
    if (!Fp3.isValid(opts.A) || !Fp3.isValid(opts.B) || !Fp3.isValid(opts.Z))
      throw new Error('mapToCurveSimpleSWU: invalid opts');
    const sqrtRatio = SWUFpSqrtRatio(Fp3, opts.Z);
    if (!Fp3.isOdd) throw new Error('Fp.isOdd is not implemented!');
    return u => {
      let tv1, tv2, tv3, tv4, tv5, tv6, x, y;
      tv1 = Fp3.sqr(u);
      tv1 = Fp3.mul(tv1, opts.Z);
      tv2 = Fp3.sqr(tv1);
      tv2 = Fp3.add(tv2, tv1);
      tv3 = Fp3.add(tv2, Fp3.ONE);
      tv3 = Fp3.mul(tv3, opts.B);
      tv4 = Fp3.cmov(opts.Z, Fp3.neg(tv2), !Fp3.eql(tv2, Fp3.ZERO));
      tv4 = Fp3.mul(tv4, opts.A);
      tv2 = Fp3.sqr(tv3);
      tv6 = Fp3.sqr(tv4);
      tv5 = Fp3.mul(tv6, opts.A);
      tv2 = Fp3.add(tv2, tv5);
      tv2 = Fp3.mul(tv2, tv3);
      tv6 = Fp3.mul(tv6, tv4);
      tv5 = Fp3.mul(tv6, opts.B);
      tv2 = Fp3.add(tv2, tv5);
      x = Fp3.mul(tv1, tv3);
      const { isValid, value } = sqrtRatio(tv2, tv6);
      y = Fp3.mul(tv1, u);
      y = Fp3.mul(y, value);
      x = Fp3.cmov(x, tv3, isValid);
      y = Fp3.cmov(y, value, isValid);
      const e1 = Fp3.isOdd(u) === Fp3.isOdd(y);
      y = Fp3.cmov(Fp3.neg(y), y, e1);
      x = Fp3.div(x, tv4);
      return { x, y };
    };
  }
  var b2n, h2b, _0n4, _1n4, _2n3, _3n2, _4n2;
  var init_weierstrass = __esm({
    'node_modules/@noble/curves/esm/abstract/weierstrass.js'() {
      init_modular();
      init_utils2();
      init_utils2();
      init_curve();
      ({ bytesToNumberBE: b2n, hexToBytes: h2b } = utils_exports);
      _0n4 = BigInt(0);
      _1n4 = BigInt(1);
      _2n3 = BigInt(2);
      _3n2 = BigInt(3);
      _4n2 = BigInt(4);
    },
  });

  // node_modules/@noble/curves/esm/abstract/bls.js
  function bls(CURVE) {
    const { Fp: Fp3, Fr: Fr2, Fp2: Fp22, Fp6: Fp62, Fp12: Fp122 } = CURVE.fields;
    const BLS_X_LEN2 = bitLen(CURVE.params.x);
    function calcPairingPrecomputes(p) {
      const { x, y } = p;
      const Qx = x,
        Qy = y,
        Qz = Fp22.ONE;
      let Rx = Qx,
        Ry = Qy,
        Rz = Qz;
      let ell_coeff = [];
      for (let i = BLS_X_LEN2 - 2; i >= 0; i--) {
        let t0 = Fp22.sqr(Ry);
        let t1 = Fp22.sqr(Rz);
        let t2 = Fp22.multiplyByB(Fp22.mul(t1, _3n3));
        let t3 = Fp22.mul(t2, _3n3);
        let t4 = Fp22.sub(Fp22.sub(Fp22.sqr(Fp22.add(Ry, Rz)), t1), t0);
        ell_coeff.push([
          Fp22.sub(t2, t0),
          Fp22.mul(Fp22.sqr(Rx), _3n3),
          Fp22.neg(t4),
          // -T4
        ]);
        Rx = Fp22.div(Fp22.mul(Fp22.mul(Fp22.sub(t0, t3), Rx), Ry), _2n4);
        Ry = Fp22.sub(Fp22.sqr(Fp22.div(Fp22.add(t0, t3), _2n4)), Fp22.mul(Fp22.sqr(t2), _3n3));
        Rz = Fp22.mul(t0, t4);
        if (bitGet(CURVE.params.x, i)) {
          let t02 = Fp22.sub(Ry, Fp22.mul(Qy, Rz));
          let t12 = Fp22.sub(Rx, Fp22.mul(Qx, Rz));
          ell_coeff.push([
            Fp22.sub(Fp22.mul(t02, Qx), Fp22.mul(t12, Qy)),
            Fp22.neg(t02),
            t12,
            // T1
          ]);
          let t22 = Fp22.sqr(t12);
          let t32 = Fp22.mul(t22, t12);
          let t42 = Fp22.mul(t22, Rx);
          let t5 = Fp22.add(Fp22.sub(t32, Fp22.mul(t42, _2n4)), Fp22.mul(Fp22.sqr(t02), Rz));
          Rx = Fp22.mul(t12, t5);
          Ry = Fp22.sub(Fp22.mul(Fp22.sub(t42, t5), t02), Fp22.mul(t32, Ry));
          Rz = Fp22.mul(Rz, t32);
        }
      }
      return ell_coeff;
    }
    function millerLoop(ell, g1) {
      const { x } = CURVE.params;
      const Px = g1[0];
      const Py = g1[1];
      let f12 = Fp122.ONE;
      for (let j = 0, i = BLS_X_LEN2 - 2; i >= 0; i--, j++) {
        const E = ell[j];
        f12 = Fp122.multiplyBy014(f12, E[0], Fp22.mul(E[1], Px), Fp22.mul(E[2], Py));
        if (bitGet(x, i)) {
          j += 1;
          const F = ell[j];
          f12 = Fp122.multiplyBy014(f12, F[0], Fp22.mul(F[1], Px), Fp22.mul(F[2], Py));
        }
        if (i !== 0) f12 = Fp122.sqr(f12);
      }
      return Fp122.conjugate(f12);
    }
    const utils = {
      randomPrivateKey: () => {
        const length = getMinHashLength(Fr2.ORDER);
        return mapHashToField(CURVE.randomBytes(length), Fr2.ORDER);
      },
      calcPairingPrecomputes,
    };
    const G1_ = weierstrassPoints({ n: Fr2.ORDER, ...CURVE.G1 });
    const G1 = Object.assign(
      G1_,
      createHasher(G1_.ProjectivePoint, CURVE.G1.mapToCurve, {
        ...CURVE.htfDefaults,
        ...CURVE.G1.htfDefaults,
      }),
    );
    function pairingPrecomputes(point) {
      const p = point;
      if (p._PPRECOMPUTES) return p._PPRECOMPUTES;
      p._PPRECOMPUTES = calcPairingPrecomputes(point.toAffine());
      return p._PPRECOMPUTES;
    }
    const G2_ = weierstrassPoints({ n: Fr2.ORDER, ...CURVE.G2 });
    const G2 = Object.assign(
      G2_,
      createHasher(G2_.ProjectivePoint, CURVE.G2.mapToCurve, {
        ...CURVE.htfDefaults,
        ...CURVE.G2.htfDefaults,
      }),
    );
    const { ShortSignature } = CURVE.G1;
    const { Signature } = CURVE.G2;
    function pairing(Q, P, withFinalExponent = true) {
      if (Q.equals(G1.ProjectivePoint.ZERO) || P.equals(G2.ProjectivePoint.ZERO))
        throw new Error('pairing is not available for ZERO point');
      Q.assertValidity();
      P.assertValidity();
      const Qa = Q.toAffine();
      const looped = millerLoop(pairingPrecomputes(P), [Qa.x, Qa.y]);
      return withFinalExponent ? Fp122.finalExponentiate(looped) : looped;
    }
    function normP1(point) {
      return point instanceof G1.ProjectivePoint ? point : G1.ProjectivePoint.fromHex(point);
    }
    function normP1Hash(point, htfOpts) {
      return point instanceof G1.ProjectivePoint
        ? point
        : G1.hashToCurve(ensureBytes('point', point), htfOpts);
    }
    function normP2(point) {
      return point instanceof G2.ProjectivePoint ? point : Signature.fromHex(point);
    }
    function normP2Hash(point, htfOpts) {
      return point instanceof G2.ProjectivePoint
        ? point
        : G2.hashToCurve(ensureBytes('point', point), htfOpts);
    }
    function getPublicKey(privateKey) {
      return G1.ProjectivePoint.fromPrivateKey(privateKey).toRawBytes(true);
    }
    function getPublicKeyForShortSignatures(privateKey) {
      return G2.ProjectivePoint.fromPrivateKey(privateKey).toRawBytes(true);
    }
    function sign(message, privateKey, htfOpts) {
      const msgPoint = normP2Hash(message, htfOpts);
      msgPoint.assertValidity();
      const sigPoint = msgPoint.multiply(G1.normPrivateKeyToScalar(privateKey));
      if (message instanceof G2.ProjectivePoint) return sigPoint;
      return Signature.toRawBytes(sigPoint);
    }
    function signShortSignature(message, privateKey, htfOpts) {
      const msgPoint = normP1Hash(message, htfOpts);
      msgPoint.assertValidity();
      const sigPoint = msgPoint.multiply(G1.normPrivateKeyToScalar(privateKey));
      if (message instanceof G1.ProjectivePoint) return sigPoint;
      return ShortSignature.toRawBytes(sigPoint);
    }
    function verify(signature, message, publicKey, htfOpts) {
      const P = normP1(publicKey);
      const Hm = normP2Hash(message, htfOpts);
      const G = G1.ProjectivePoint.BASE;
      const S = normP2(signature);
      const ePHm = pairing(P.negate(), Hm, false);
      const eGS = pairing(G, S, false);
      const exp = Fp122.finalExponentiate(Fp122.mul(eGS, ePHm));
      return Fp122.eql(exp, Fp122.ONE);
    }
    function verifyShortSignature(signature, message, publicKey, htfOpts) {
      const P = normP2(publicKey);
      const Hm = normP1Hash(message, htfOpts);
      const G = G2.ProjectivePoint.BASE;
      const S = normP1(signature);
      const eHmP = pairing(Hm, P, false);
      const eSG = pairing(S, G.negate(), false);
      const exp = Fp122.finalExponentiate(Fp122.mul(eSG, eHmP));
      return Fp122.eql(exp, Fp122.ONE);
    }
    function aggregatePublicKeys(publicKeys) {
      if (!publicKeys.length) throw new Error('Expected non-empty array');
      const agg = publicKeys.map(normP1).reduce((sum, p) => sum.add(p), G1.ProjectivePoint.ZERO);
      const aggAffine = agg;
      if (publicKeys[0] instanceof G1.ProjectivePoint) {
        aggAffine.assertValidity();
        return aggAffine;
      }
      return aggAffine.toRawBytes(true);
    }
    function aggregateSignatures(signatures) {
      if (!signatures.length) throw new Error('Expected non-empty array');
      const agg = signatures.map(normP2).reduce((sum, s) => sum.add(s), G2.ProjectivePoint.ZERO);
      const aggAffine = agg;
      if (signatures[0] instanceof G2.ProjectivePoint) {
        aggAffine.assertValidity();
        return aggAffine;
      }
      return Signature.toRawBytes(aggAffine);
    }
    function aggregateShortSignatures(signatures) {
      if (!signatures.length) throw new Error('Expected non-empty array');
      const agg = signatures.map(normP1).reduce((sum, s) => sum.add(s), G1.ProjectivePoint.ZERO);
      const aggAffine = agg;
      if (signatures[0] instanceof G1.ProjectivePoint) {
        aggAffine.assertValidity();
        return aggAffine;
      }
      return ShortSignature.toRawBytes(aggAffine);
    }
    function verifyBatch(signature, messages, publicKeys, htfOpts) {
      if (!messages.length) throw new Error('Expected non-empty messages array');
      if (publicKeys.length !== messages.length)
        throw new Error('Pubkey count should equal msg count');
      const sig = normP2(signature);
      const nMessages = messages.map(i => normP2Hash(i, htfOpts));
      const nPublicKeys = publicKeys.map(normP1);
      try {
        const paired = [];
        for (const message of new Set(nMessages)) {
          const groupPublicKey = nMessages.reduce(
            (groupPublicKey2, subMessage, i) =>
              subMessage === message ? groupPublicKey2.add(nPublicKeys[i]) : groupPublicKey2,
            G1.ProjectivePoint.ZERO,
          );
          paired.push(pairing(groupPublicKey, message, false));
        }
        paired.push(pairing(G1.ProjectivePoint.BASE.negate(), sig, false));
        const product = paired.reduce((a, b) => Fp122.mul(a, b), Fp122.ONE);
        const exp = Fp122.finalExponentiate(product);
        return Fp122.eql(exp, Fp122.ONE);
      } catch {
        return false;
      }
    }
    G1.ProjectivePoint.BASE._setWindowSize(4);
    return {
      getPublicKey,
      getPublicKeyForShortSignatures,
      sign,
      signShortSignature,
      verify,
      verifyBatch,
      verifyShortSignature,
      aggregatePublicKeys,
      aggregateSignatures,
      aggregateShortSignatures,
      millerLoop,
      pairing,
      G1,
      G2,
      Signature,
      ShortSignature,
      fields: {
        Fr: Fr2,
        Fp: Fp3,
        Fp2: Fp22,
        Fp6: Fp62,
        Fp12: Fp122,
      },
      params: {
        x: CURVE.params.x,
        r: CURVE.params.r,
        G1b: CURVE.G1.b,
        G2b: CURVE.G2.b,
      },
      utils,
    };
  }
  var _2n4, _3n3;
  var init_bls = __esm({
    'node_modules/@noble/curves/esm/abstract/bls.js'() {
      init_modular();
      init_utils2();
      init_hash_to_curve();
      init_weierstrass();
      _2n4 = BigInt(2);
      _3n3 = BigInt(3);
    },
  });

  // node_modules/@noble/curves/esm/bls12-381.js
  function Fp4Square(a, b) {
    const a2 = Fp2.sqr(a);
    const b2 = Fp2.sqr(b);
    return {
      first: Fp2.add(Fp2.mulByNonresidue(b2), a2),
      second: Fp2.sub(Fp2.sub(Fp2.sqr(Fp2.add(a, b)), a2), b2),
      // (a + b)² - a² - b²
    };
  }
  function psi(x, y) {
    const x2 = Fp12.mul(Fp12.frobeniusMap(Fp12.multiplyByFp2(wsq_inv, x), 1), wsq).c0.c0;
    const y2 = Fp12.mul(Fp12.frobeniusMap(Fp12.multiplyByFp2(wcu_inv, y), 1), wcu).c0.c0;
    return [x2, y2];
  }
  function G2psi(c, P) {
    const affine = P.toAffine();
    const p = psi(affine.x, affine.y);
    return new c(p[0], p[1], Fp2.ONE);
  }
  function psi2(x, y) {
    return [Fp2.mul(x, PSI2_C1), Fp2.neg(y)];
  }
  function G2psi2(c, P) {
    const affine = P.toAffine();
    const p = psi2(affine.x, affine.y);
    return new c(p[0], p[1], Fp2.ONE);
  }
  function signatureG1ToRawBytes(point) {
    point.assertValidity();
    const isZero = point.equals(bls12_381.G1.ProjectivePoint.ZERO);
    const { x, y } = point.toAffine();
    if (isZero) return COMPRESSED_ZERO.slice();
    const P = Fp.ORDER;
    let num;
    num = bitSet(x, C_BIT_POS, Boolean((y * _2n5) / P));
    num = bitSet(num, S_BIT_POS, true);
    return numberToBytesBE(num, Fp.BYTES);
  }
  function signatureG2ToRawBytes(point) {
    point.assertValidity();
    const len = Fp.BYTES;
    if (point.equals(bls12_381.G2.ProjectivePoint.ZERO))
      return concatBytes(COMPRESSED_ZERO, numberToBytesBE(_0n5, len));
    const { x, y } = point.toAffine();
    const { re: x0, im: x1 } = Fp2.reim(x);
    const { re: y0, im: y1 } = Fp2.reim(y);
    const tmp = y1 > _0n5 ? y1 * _2n5 : y0 * _2n5;
    const aflag1 = Boolean((tmp / Fp.ORDER) & _1n5);
    const z1 = bitSet(bitSet(x1, 381, aflag1), S_BIT_POS, true);
    const z2 = x0;
    return concatBytes(numberToBytesBE(z1, len), numberToBytesBE(z2, len));
  }
  var _0n5,
    _1n5,
    _2n5,
    _3n4,
    _4n3,
    _8n2,
    _16n2,
    Fp_raw,
    Fp,
    Fr,
    Fp2Add,
    Fp2Subtract,
    Fp2Multiply,
    Fp2Square,
    FP2_ORDER,
    Fp2,
    FP2_FROBENIUS_COEFFICIENTS,
    rv1,
    FP2_ROOTS_OF_UNITY,
    Fp6Add,
    Fp6Subtract,
    Fp6Multiply,
    Fp6Square,
    Fp6,
    FP6_FROBENIUS_COEFFICIENTS_1,
    FP6_FROBENIUS_COEFFICIENTS_2,
    BLS_X,
    BLS_X_LEN,
    Fp12Add,
    Fp12Subtract,
    Fp12Multiply,
    Fp12Square,
    Fp12,
    FP12_FROBENIUS_COEFFICIENTS,
    isogenyMapG2,
    isogenyMapG1,
    G2_SWU,
    G1_SWU,
    ut_root,
    wsq,
    wcu,
    wsq_inv,
    wcu_inv,
    PSI2_C1,
    htfDefaults,
    C_BIT_POS,
    I_BIT_POS,
    S_BIT_POS,
    COMPRESSED_ZERO,
    bls12_381;
  var init_bls12_381 = __esm({
    'node_modules/@noble/curves/esm/bls12-381.js'() {
      init_sha256();
      init_utils();
      init_bls();
      init_modular();
      init_utils2();
      init_weierstrass();
      init_hash_to_curve();
      _0n5 = BigInt(0);
      _1n5 = BigInt(1);
      _2n5 = BigInt(2);
      _3n4 = BigInt(3);
      _4n3 = BigInt(4);
      _8n2 = BigInt(8);
      _16n2 = BigInt(16);
      Fp_raw = BigInt(
        '0x1a0111ea397fe69a4b1ba7b6434bacd764774b84f38512bf6730d2a0f6b0f6241eabfffeb153ffffb9feffffffffaaab',
      );
      Fp = Field(Fp_raw);
      Fr = Field(BigInt('0x73eda753299d7d483339d80809a1d80553bda402fffe5bfeffffffff00000001'));
      Fp2Add = ({ c0, c1 }, { c0: r0, c1: r1 }) => ({
        c0: Fp.add(c0, r0),
        c1: Fp.add(c1, r1),
      });
      Fp2Subtract = ({ c0, c1 }, { c0: r0, c1: r1 }) => ({
        c0: Fp.sub(c0, r0),
        c1: Fp.sub(c1, r1),
      });
      Fp2Multiply = ({ c0, c1 }, rhs) => {
        if (typeof rhs === 'bigint') return { c0: Fp.mul(c0, rhs), c1: Fp.mul(c1, rhs) };
        const { c0: r0, c1: r1 } = rhs;
        let t1 = Fp.mul(c0, r0);
        let t2 = Fp.mul(c1, r1);
        const o0 = Fp.sub(t1, t2);
        const o1 = Fp.sub(Fp.mul(Fp.add(c0, c1), Fp.add(r0, r1)), Fp.add(t1, t2));
        return { c0: o0, c1: o1 };
      };
      Fp2Square = ({ c0, c1 }) => {
        const a = Fp.add(c0, c1);
        const b = Fp.sub(c0, c1);
        const c = Fp.add(c0, c0);
        return { c0: Fp.mul(a, b), c1: Fp.mul(c, c1) };
      };
      FP2_ORDER = Fp_raw * Fp_raw;
      Fp2 = {
        ORDER: FP2_ORDER,
        BITS: bitLen(FP2_ORDER),
        BYTES: Math.ceil(bitLen(FP2_ORDER) / 8),
        MASK: bitMask(bitLen(FP2_ORDER)),
        ZERO: { c0: Fp.ZERO, c1: Fp.ZERO },
        ONE: { c0: Fp.ONE, c1: Fp.ZERO },
        create: num => num,
        isValid: ({ c0, c1 }) => typeof c0 === 'bigint' && typeof c1 === 'bigint',
        is0: ({ c0, c1 }) => Fp.is0(c0) && Fp.is0(c1),
        eql: ({ c0, c1 }, { c0: r0, c1: r1 }) => Fp.eql(c0, r0) && Fp.eql(c1, r1),
        neg: ({ c0, c1 }) => ({ c0: Fp.neg(c0), c1: Fp.neg(c1) }),
        pow: (num, power) => FpPow(Fp2, num, power),
        invertBatch: nums => FpInvertBatch(Fp2, nums),
        // Normalized
        add: Fp2Add,
        sub: Fp2Subtract,
        mul: Fp2Multiply,
        sqr: Fp2Square,
        // NonNormalized stuff
        addN: Fp2Add,
        subN: Fp2Subtract,
        mulN: Fp2Multiply,
        sqrN: Fp2Square,
        // Why inversion for bigint inside Fp instead of Fp2? it is even used in that context?
        div: (lhs, rhs) =>
          Fp2.mul(lhs, typeof rhs === 'bigint' ? Fp.inv(Fp.create(rhs)) : Fp2.inv(rhs)),
        inv: ({ c0: a, c1: b }) => {
          const factor = Fp.inv(Fp.create(a * a + b * b));
          return { c0: Fp.mul(factor, Fp.create(a)), c1: Fp.mul(factor, Fp.create(-b)) };
        },
        sqrt: num => {
          if (Fp2.eql(num, Fp2.ZERO)) return Fp2.ZERO;
          const candidateSqrt = Fp2.pow(num, (Fp2.ORDER + _8n2) / _16n2);
          const check = Fp2.div(Fp2.sqr(candidateSqrt), num);
          const R = FP2_ROOTS_OF_UNITY;
          const divisor = [R[0], R[2], R[4], R[6]].find(r => Fp2.eql(r, check));
          if (!divisor) throw new Error('No root');
          const index = R.indexOf(divisor);
          const root = R[index / 2];
          if (!root) throw new Error('Invalid root');
          const x1 = Fp2.div(candidateSqrt, root);
          const x2 = Fp2.neg(x1);
          const { re: re1, im: im1 } = Fp2.reim(x1);
          const { re: re2, im: im2 } = Fp2.reim(x2);
          if (im1 > im2 || (im1 === im2 && re1 > re2)) return x1;
          return x2;
        },
        // Same as sgn0_m_eq_2 in RFC 9380
        isOdd: x => {
          const { re: x0, im: x1 } = Fp2.reim(x);
          const sign_0 = x0 % _2n5;
          const zero_0 = x0 === _0n5;
          const sign_1 = x1 % _2n5;
          return BigInt(sign_0 || (zero_0 && sign_1)) == _1n5;
        },
        // Bytes util
        fromBytes(b) {
          if (b.length !== Fp2.BYTES) throw new Error(`fromBytes wrong length=${b.length}`);
          return {
            c0: Fp.fromBytes(b.subarray(0, Fp.BYTES)),
            c1: Fp.fromBytes(b.subarray(Fp.BYTES)),
          };
        },
        toBytes: ({ c0, c1 }) => concatBytes(Fp.toBytes(c0), Fp.toBytes(c1)),
        cmov: ({ c0, c1 }, { c0: r0, c1: r1 }, c) => ({
          c0: Fp.cmov(c0, r0, c),
          c1: Fp.cmov(c1, r1, c),
        }),
        // Specific utils
        // toString() {
        //   return `Fp2(${this.c0} + ${this.c1}×i)`;
        // }
        reim: ({ c0, c1 }) => ({ re: c0, im: c1 }),
        // multiply by u + 1
        mulByNonresidue: ({ c0, c1 }) => ({ c0: Fp.sub(c0, c1), c1: Fp.add(c0, c1) }),
        multiplyByB: ({ c0, c1 }) => {
          let t0 = Fp.mul(c0, _4n3);
          let t1 = Fp.mul(c1, _4n3);
          return { c0: Fp.sub(t0, t1), c1: Fp.add(t0, t1) };
        },
        fromBigTuple: tuple => {
          if (tuple.length !== 2) throw new Error('Invalid tuple');
          const fps = tuple.map(n => Fp.create(n));
          return { c0: fps[0], c1: fps[1] };
        },
        frobeniusMap: ({ c0, c1 }, power) => ({
          c0,
          c1: Fp.mul(c1, FP2_FROBENIUS_COEFFICIENTS[power % 2]),
        }),
      };
      FP2_FROBENIUS_COEFFICIENTS = [
        BigInt('0x1'),
        BigInt(
          '0x1a0111ea397fe69a4b1ba7b6434bacd764774b84f38512bf6730d2a0f6b0f6241eabfffeb153ffffb9feffffffffaaaa',
        ),
      ].map(item => Fp.create(item));
      rv1 = BigInt(
        '0x6af0e0437ff400b6831e36d6bd17ffe48395dabc2d3435e77f76e17009241c5ee67992f72ec05f4c81084fbede3cc09',
      );
      FP2_ROOTS_OF_UNITY = [
        [_1n5, _0n5],
        [rv1, -rv1],
        [_0n5, _1n5],
        [rv1, rv1],
        [-_1n5, _0n5],
        [-rv1, rv1],
        [_0n5, -_1n5],
        [-rv1, -rv1],
      ].map(pair => Fp2.fromBigTuple(pair));
      Fp6Add = ({ c0, c1, c2 }, { c0: r0, c1: r1, c2: r2 }) => ({
        c0: Fp2.add(c0, r0),
        c1: Fp2.add(c1, r1),
        c2: Fp2.add(c2, r2),
      });
      Fp6Subtract = ({ c0, c1, c2 }, { c0: r0, c1: r1, c2: r2 }) => ({
        c0: Fp2.sub(c0, r0),
        c1: Fp2.sub(c1, r1),
        c2: Fp2.sub(c2, r2),
      });
      Fp6Multiply = ({ c0, c1, c2 }, rhs) => {
        if (typeof rhs === 'bigint') {
          return {
            c0: Fp2.mul(c0, rhs),
            c1: Fp2.mul(c1, rhs),
            c2: Fp2.mul(c2, rhs),
          };
        }
        const { c0: r0, c1: r1, c2: r2 } = rhs;
        const t0 = Fp2.mul(c0, r0);
        const t1 = Fp2.mul(c1, r1);
        const t2 = Fp2.mul(c2, r2);
        return {
          // t0 + (c1 + c2) * (r1 * r2) - (T1 + T2) * (u + 1)
          c0: Fp2.add(
            t0,
            Fp2.mulByNonresidue(
              Fp2.sub(Fp2.mul(Fp2.add(c1, c2), Fp2.add(r1, r2)), Fp2.add(t1, t2)),
            ),
          ),
          // (c0 + c1) * (r0 + r1) - (T0 + T1) + T2 * (u + 1)
          c1: Fp2.add(
            Fp2.sub(Fp2.mul(Fp2.add(c0, c1), Fp2.add(r0, r1)), Fp2.add(t0, t1)),
            Fp2.mulByNonresidue(t2),
          ),
          // T1 + (c0 + c2) * (r0 + r2) - T0 + T2
          c2: Fp2.sub(Fp2.add(t1, Fp2.mul(Fp2.add(c0, c2), Fp2.add(r0, r2))), Fp2.add(t0, t2)),
        };
      };
      Fp6Square = ({ c0, c1, c2 }) => {
        let t0 = Fp2.sqr(c0);
        let t1 = Fp2.mul(Fp2.mul(c0, c1), _2n5);
        let t3 = Fp2.mul(Fp2.mul(c1, c2), _2n5);
        let t4 = Fp2.sqr(c2);
        return {
          c0: Fp2.add(Fp2.mulByNonresidue(t3), t0),
          c1: Fp2.add(Fp2.mulByNonresidue(t4), t1),
          // T1 + (c0 - c1 + c2)² + T3 - T0 - T4
          c2: Fp2.sub(
            Fp2.sub(Fp2.add(Fp2.add(t1, Fp2.sqr(Fp2.add(Fp2.sub(c0, c1), c2))), t3), t0),
            t4,
          ),
        };
      };
      Fp6 = {
        ORDER: Fp2.ORDER,
        BITS: 3 * Fp2.BITS,
        BYTES: 3 * Fp2.BYTES,
        MASK: bitMask(3 * Fp2.BITS),
        ZERO: { c0: Fp2.ZERO, c1: Fp2.ZERO, c2: Fp2.ZERO },
        ONE: { c0: Fp2.ONE, c1: Fp2.ZERO, c2: Fp2.ZERO },
        create: num => num,
        isValid: ({ c0, c1, c2 }) => Fp2.isValid(c0) && Fp2.isValid(c1) && Fp2.isValid(c2),
        is0: ({ c0, c1, c2 }) => Fp2.is0(c0) && Fp2.is0(c1) && Fp2.is0(c2),
        neg: ({ c0, c1, c2 }) => ({ c0: Fp2.neg(c0), c1: Fp2.neg(c1), c2: Fp2.neg(c2) }),
        eql: ({ c0, c1, c2 }, { c0: r0, c1: r1, c2: r2 }) =>
          Fp2.eql(c0, r0) && Fp2.eql(c1, r1) && Fp2.eql(c2, r2),
        sqrt: () => {
          throw new Error('Not implemented');
        },
        // Do we need division by bigint at all? Should be done via order:
        div: (lhs, rhs) =>
          Fp6.mul(lhs, typeof rhs === 'bigint' ? Fp.inv(Fp.create(rhs)) : Fp6.inv(rhs)),
        pow: (num, power) => FpPow(Fp6, num, power),
        invertBatch: nums => FpInvertBatch(Fp6, nums),
        // Normalized
        add: Fp6Add,
        sub: Fp6Subtract,
        mul: Fp6Multiply,
        sqr: Fp6Square,
        // NonNormalized stuff
        addN: Fp6Add,
        subN: Fp6Subtract,
        mulN: Fp6Multiply,
        sqrN: Fp6Square,
        inv: ({ c0, c1, c2 }) => {
          let t0 = Fp2.sub(Fp2.sqr(c0), Fp2.mulByNonresidue(Fp2.mul(c2, c1)));
          let t1 = Fp2.sub(Fp2.mulByNonresidue(Fp2.sqr(c2)), Fp2.mul(c0, c1));
          let t2 = Fp2.sub(Fp2.sqr(c1), Fp2.mul(c0, c2));
          let t4 = Fp2.inv(
            Fp2.add(
              Fp2.mulByNonresidue(Fp2.add(Fp2.mul(c2, t1), Fp2.mul(c1, t2))),
              Fp2.mul(c0, t0),
            ),
          );
          return { c0: Fp2.mul(t4, t0), c1: Fp2.mul(t4, t1), c2: Fp2.mul(t4, t2) };
        },
        // Bytes utils
        fromBytes: b => {
          if (b.length !== Fp6.BYTES) throw new Error(`fromBytes wrong length=${b.length}`);
          return {
            c0: Fp2.fromBytes(b.subarray(0, Fp2.BYTES)),
            c1: Fp2.fromBytes(b.subarray(Fp2.BYTES, 2 * Fp2.BYTES)),
            c2: Fp2.fromBytes(b.subarray(2 * Fp2.BYTES)),
          };
        },
        toBytes: ({ c0, c1, c2 }) => concatBytes(Fp2.toBytes(c0), Fp2.toBytes(c1), Fp2.toBytes(c2)),
        cmov: ({ c0, c1, c2 }, { c0: r0, c1: r1, c2: r2 }, c) => ({
          c0: Fp2.cmov(c0, r0, c),
          c1: Fp2.cmov(c1, r1, c),
          c2: Fp2.cmov(c2, r2, c),
        }),
        // Utils
        //   fromTriple(triple: [Fp2, Fp2, Fp2]) {
        //     return new Fp6(...triple);
        //   }
        //   toString() {
        //     return `Fp6(${this.c0} + ${this.c1} * v, ${this.c2} * v^2)`;
        //   }
        fromBigSix: t => {
          if (!Array.isArray(t) || t.length !== 6) throw new Error('Invalid Fp6 usage');
          return {
            c0: Fp2.fromBigTuple(t.slice(0, 2)),
            c1: Fp2.fromBigTuple(t.slice(2, 4)),
            c2: Fp2.fromBigTuple(t.slice(4, 6)),
          };
        },
        frobeniusMap: ({ c0, c1, c2 }, power) => ({
          c0: Fp2.frobeniusMap(c0, power),
          c1: Fp2.mul(Fp2.frobeniusMap(c1, power), FP6_FROBENIUS_COEFFICIENTS_1[power % 6]),
          c2: Fp2.mul(Fp2.frobeniusMap(c2, power), FP6_FROBENIUS_COEFFICIENTS_2[power % 6]),
        }),
        mulByNonresidue: ({ c0, c1, c2 }) => ({ c0: Fp2.mulByNonresidue(c2), c1: c0, c2: c1 }),
        // Sparse multiplication
        multiplyBy1: ({ c0, c1, c2 }, b1) => ({
          c0: Fp2.mulByNonresidue(Fp2.mul(c2, b1)),
          c1: Fp2.mul(c0, b1),
          c2: Fp2.mul(c1, b1),
        }),
        // Sparse multiplication
        multiplyBy01({ c0, c1, c2 }, b0, b1) {
          let t0 = Fp2.mul(c0, b0);
          let t1 = Fp2.mul(c1, b1);
          return {
            // ((c1 + c2) * b1 - T1) * (u + 1) + T0
            c0: Fp2.add(Fp2.mulByNonresidue(Fp2.sub(Fp2.mul(Fp2.add(c1, c2), b1), t1)), t0),
            // (b0 + b1) * (c0 + c1) - T0 - T1
            c1: Fp2.sub(Fp2.sub(Fp2.mul(Fp2.add(b0, b1), Fp2.add(c0, c1)), t0), t1),
            // (c0 + c2) * b0 - T0 + T1
            c2: Fp2.add(Fp2.sub(Fp2.mul(Fp2.add(c0, c2), b0), t0), t1),
          };
        },
        multiplyByFp2: ({ c0, c1, c2 }, rhs) => ({
          c0: Fp2.mul(c0, rhs),
          c1: Fp2.mul(c1, rhs),
          c2: Fp2.mul(c2, rhs),
        }),
      };
      FP6_FROBENIUS_COEFFICIENTS_1 = [
        [BigInt('0x1'), BigInt('0x0')],
        [
          BigInt('0x0'),
          BigInt(
            '0x1a0111ea397fe699ec02408663d4de85aa0d857d89759ad4897d29650fb85f9b409427eb4f49fffd8bfd00000000aaac',
          ),
        ],
        [
          BigInt(
            '0x00000000000000005f19672fdf76ce51ba69c6076a0f77eaddb3a93be6f89688de17d813620a00022e01fffffffefffe',
          ),
          BigInt('0x0'),
        ],
        [BigInt('0x0'), BigInt('0x1')],
        [
          BigInt(
            '0x1a0111ea397fe699ec02408663d4de85aa0d857d89759ad4897d29650fb85f9b409427eb4f49fffd8bfd00000000aaac',
          ),
          BigInt('0x0'),
        ],
        [
          BigInt('0x0'),
          BigInt(
            '0x00000000000000005f19672fdf76ce51ba69c6076a0f77eaddb3a93be6f89688de17d813620a00022e01fffffffefffe',
          ),
        ],
      ].map(pair => Fp2.fromBigTuple(pair));
      FP6_FROBENIUS_COEFFICIENTS_2 = [
        [BigInt('0x1'), BigInt('0x0')],
        [
          BigInt(
            '0x1a0111ea397fe699ec02408663d4de85aa0d857d89759ad4897d29650fb85f9b409427eb4f49fffd8bfd00000000aaad',
          ),
          BigInt('0x0'),
        ],
        [
          BigInt(
            '0x1a0111ea397fe699ec02408663d4de85aa0d857d89759ad4897d29650fb85f9b409427eb4f49fffd8bfd00000000aaac',
          ),
          BigInt('0x0'),
        ],
        [
          BigInt(
            '0x1a0111ea397fe69a4b1ba7b6434bacd764774b84f38512bf6730d2a0f6b0f6241eabfffeb153ffffb9feffffffffaaaa',
          ),
          BigInt('0x0'),
        ],
        [
          BigInt(
            '0x00000000000000005f19672fdf76ce51ba69c6076a0f77eaddb3a93be6f89688de17d813620a00022e01fffffffefffe',
          ),
          BigInt('0x0'),
        ],
        [
          BigInt(
            '0x00000000000000005f19672fdf76ce51ba69c6076a0f77eaddb3a93be6f89688de17d813620a00022e01fffffffeffff',
          ),
          BigInt('0x0'),
        ],
      ].map(pair => Fp2.fromBigTuple(pair));
      BLS_X = BigInt('0xd201000000010000');
      BLS_X_LEN = bitLen(BLS_X);
      Fp12Add = ({ c0, c1 }, { c0: r0, c1: r1 }) => ({
        c0: Fp6.add(c0, r0),
        c1: Fp6.add(c1, r1),
      });
      Fp12Subtract = ({ c0, c1 }, { c0: r0, c1: r1 }) => ({
        c0: Fp6.sub(c0, r0),
        c1: Fp6.sub(c1, r1),
      });
      Fp12Multiply = ({ c0, c1 }, rhs) => {
        if (typeof rhs === 'bigint') return { c0: Fp6.mul(c0, rhs), c1: Fp6.mul(c1, rhs) };
        let { c0: r0, c1: r1 } = rhs;
        let t1 = Fp6.mul(c0, r0);
        let t2 = Fp6.mul(c1, r1);
        return {
          c0: Fp6.add(t1, Fp6.mulByNonresidue(t2)),
          // (c0 + c1) * (r0 + r1) - (T1 + T2)
          c1: Fp6.sub(Fp6.mul(Fp6.add(c0, c1), Fp6.add(r0, r1)), Fp6.add(t1, t2)),
        };
      };
      Fp12Square = ({ c0, c1 }) => {
        let ab = Fp6.mul(c0, c1);
        return {
          // (c1 * v + c0) * (c0 + c1) - AB - AB * v
          c0: Fp6.sub(
            Fp6.sub(Fp6.mul(Fp6.add(Fp6.mulByNonresidue(c1), c0), Fp6.add(c0, c1)), ab),
            Fp6.mulByNonresidue(ab),
          ),
          c1: Fp6.add(ab, ab),
        };
      };
      Fp12 = {
        ORDER: Fp2.ORDER,
        BITS: 2 * Fp2.BITS,
        BYTES: 2 * Fp2.BYTES,
        MASK: bitMask(2 * Fp2.BITS),
        ZERO: { c0: Fp6.ZERO, c1: Fp6.ZERO },
        ONE: { c0: Fp6.ONE, c1: Fp6.ZERO },
        create: num => num,
        isValid: ({ c0, c1 }) => Fp6.isValid(c0) && Fp6.isValid(c1),
        is0: ({ c0, c1 }) => Fp6.is0(c0) && Fp6.is0(c1),
        neg: ({ c0, c1 }) => ({ c0: Fp6.neg(c0), c1: Fp6.neg(c1) }),
        eql: ({ c0, c1 }, { c0: r0, c1: r1 }) => Fp6.eql(c0, r0) && Fp6.eql(c1, r1),
        sqrt: () => {
          throw new Error('Not implemented');
        },
        inv: ({ c0, c1 }) => {
          let t = Fp6.inv(Fp6.sub(Fp6.sqr(c0), Fp6.mulByNonresidue(Fp6.sqr(c1))));
          return { c0: Fp6.mul(c0, t), c1: Fp6.neg(Fp6.mul(c1, t)) };
        },
        div: (lhs, rhs) =>
          Fp12.mul(lhs, typeof rhs === 'bigint' ? Fp.inv(Fp.create(rhs)) : Fp12.inv(rhs)),
        pow: (num, power) => FpPow(Fp12, num, power),
        invertBatch: nums => FpInvertBatch(Fp12, nums),
        // Normalized
        add: Fp12Add,
        sub: Fp12Subtract,
        mul: Fp12Multiply,
        sqr: Fp12Square,
        // NonNormalized stuff
        addN: Fp12Add,
        subN: Fp12Subtract,
        mulN: Fp12Multiply,
        sqrN: Fp12Square,
        // Bytes utils
        fromBytes: b => {
          if (b.length !== Fp12.BYTES) throw new Error(`fromBytes wrong length=${b.length}`);
          return {
            c0: Fp6.fromBytes(b.subarray(0, Fp6.BYTES)),
            c1: Fp6.fromBytes(b.subarray(Fp6.BYTES)),
          };
        },
        toBytes: ({ c0, c1 }) => concatBytes(Fp6.toBytes(c0), Fp6.toBytes(c1)),
        cmov: ({ c0, c1 }, { c0: r0, c1: r1 }, c) => ({
          c0: Fp6.cmov(c0, r0, c),
          c1: Fp6.cmov(c1, r1, c),
        }),
        // Utils
        // toString() {
        //   return `Fp12(${this.c0} + ${this.c1} * w)`;
        // },
        // fromTuple(c: [Fp6, Fp6]) {
        //   return new Fp12(...c);
        // }
        fromBigTwelve: t => ({
          c0: Fp6.fromBigSix(t.slice(0, 6)),
          c1: Fp6.fromBigSix(t.slice(6, 12)),
        }),
        // Raises to q**i -th power
        frobeniusMap(lhs, power) {
          const r0 = Fp6.frobeniusMap(lhs.c0, power);
          const { c0, c1, c2 } = Fp6.frobeniusMap(lhs.c1, power);
          const coeff = FP12_FROBENIUS_COEFFICIENTS[power % 12];
          return {
            c0: r0,
            c1: Fp6.create({
              c0: Fp2.mul(c0, coeff),
              c1: Fp2.mul(c1, coeff),
              c2: Fp2.mul(c2, coeff),
            }),
          };
        },
        // Sparse multiplication
        multiplyBy014: ({ c0, c1 }, o0, o1, o4) => {
          let t0 = Fp6.multiplyBy01(c0, o0, o1);
          let t1 = Fp6.multiplyBy1(c1, o4);
          return {
            c0: Fp6.add(Fp6.mulByNonresidue(t1), t0),
            // (c1 + c0) * [o0, o1+o4] - T0 - T1
            c1: Fp6.sub(Fp6.sub(Fp6.multiplyBy01(Fp6.add(c1, c0), o0, Fp2.add(o1, o4)), t0), t1),
          };
        },
        multiplyByFp2: ({ c0, c1 }, rhs) => ({
          c0: Fp6.multiplyByFp2(c0, rhs),
          c1: Fp6.multiplyByFp2(c1, rhs),
        }),
        conjugate: ({ c0, c1 }) => ({ c0, c1: Fp6.neg(c1) }),
        // A cyclotomic group is a subgroup of Fp^n defined by
        //   GΦₙ(p) = {α ∈ Fpⁿ : α^Φₙ(p) = 1}
        // The result of any pairing is in a cyclotomic subgroup
        // https://eprint.iacr.org/2009/565.pdf
        _cyclotomicSquare: ({ c0, c1 }) => {
          const { c0: c0c0, c1: c0c1, c2: c0c2 } = c0;
          const { c0: c1c0, c1: c1c1, c2: c1c2 } = c1;
          const { first: t3, second: t4 } = Fp4Square(c0c0, c1c1);
          const { first: t5, second: t6 } = Fp4Square(c1c0, c0c2);
          const { first: t7, second: t8 } = Fp4Square(c0c1, c1c2);
          let t9 = Fp2.mulByNonresidue(t8);
          return {
            c0: Fp6.create({
              c0: Fp2.add(Fp2.mul(Fp2.sub(t3, c0c0), _2n5), t3),
              c1: Fp2.add(Fp2.mul(Fp2.sub(t5, c0c1), _2n5), t5),
              c2: Fp2.add(Fp2.mul(Fp2.sub(t7, c0c2), _2n5), t7),
            }),
            c1: Fp6.create({
              c0: Fp2.add(Fp2.mul(Fp2.add(t9, c1c0), _2n5), t9),
              c1: Fp2.add(Fp2.mul(Fp2.add(t4, c1c1), _2n5), t4),
              c2: Fp2.add(Fp2.mul(Fp2.add(t6, c1c2), _2n5), t6),
            }),
          };
        },
        _cyclotomicExp(num, n) {
          let z = Fp12.ONE;
          for (let i = BLS_X_LEN - 1; i >= 0; i--) {
            z = Fp12._cyclotomicSquare(z);
            if (bitGet(n, i)) z = Fp12.mul(z, num);
          }
          return z;
        },
        // https://eprint.iacr.org/2010/354.pdf
        // https://eprint.iacr.org/2009/565.pdf
        finalExponentiate: num => {
          const x = BLS_X;
          const t0 = Fp12.div(Fp12.frobeniusMap(num, 6), num);
          const t1 = Fp12.mul(Fp12.frobeniusMap(t0, 2), t0);
          const t2 = Fp12.conjugate(Fp12._cyclotomicExp(t1, x));
          const t3 = Fp12.mul(Fp12.conjugate(Fp12._cyclotomicSquare(t1)), t2);
          const t4 = Fp12.conjugate(Fp12._cyclotomicExp(t3, x));
          const t5 = Fp12.conjugate(Fp12._cyclotomicExp(t4, x));
          const t6 = Fp12.mul(
            Fp12.conjugate(Fp12._cyclotomicExp(t5, x)),
            Fp12._cyclotomicSquare(t2),
          );
          const t7 = Fp12.conjugate(Fp12._cyclotomicExp(t6, x));
          const t2_t5_pow_q2 = Fp12.frobeniusMap(Fp12.mul(t2, t5), 2);
          const t4_t1_pow_q3 = Fp12.frobeniusMap(Fp12.mul(t4, t1), 3);
          const t6_t1c_pow_q1 = Fp12.frobeniusMap(Fp12.mul(t6, Fp12.conjugate(t1)), 1);
          const t7_t3c_t1 = Fp12.mul(Fp12.mul(t7, Fp12.conjugate(t3)), t1);
          return Fp12.mul(Fp12.mul(Fp12.mul(t2_t5_pow_q2, t4_t1_pow_q3), t6_t1c_pow_q1), t7_t3c_t1);
        },
      };
      FP12_FROBENIUS_COEFFICIENTS = [
        [BigInt('0x1'), BigInt('0x0')],
        [
          BigInt(
            '0x1904d3bf02bb0667c231beb4202c0d1f0fd603fd3cbd5f4f7b2443d784bab9c4f67ea53d63e7813d8d0775ed92235fb8',
          ),
          BigInt(
            '0x00fc3e2b36c4e03288e9e902231f9fb854a14787b6c7b36fec0c8ec971f63c5f282d5ac14d6c7ec22cf78a126ddc4af3',
          ),
        ],
        [
          BigInt(
            '0x00000000000000005f19672fdf76ce51ba69c6076a0f77eaddb3a93be6f89688de17d813620a00022e01fffffffeffff',
          ),
          BigInt('0x0'),
        ],
        [
          BigInt(
            '0x135203e60180a68ee2e9c448d77a2cd91c3dedd930b1cf60ef396489f61eb45e304466cf3e67fa0af1ee7b04121bdea2',
          ),
          BigInt(
            '0x06af0e0437ff400b6831e36d6bd17ffe48395dabc2d3435e77f76e17009241c5ee67992f72ec05f4c81084fbede3cc09',
          ),
        ],
        [
          BigInt(
            '0x00000000000000005f19672fdf76ce51ba69c6076a0f77eaddb3a93be6f89688de17d813620a00022e01fffffffefffe',
          ),
          BigInt('0x0'),
        ],
        [
          BigInt(
            '0x144e4211384586c16bd3ad4afa99cc9170df3560e77982d0db45f3536814f0bd5871c1908bd478cd1ee605167ff82995',
          ),
          BigInt(
            '0x05b2cfd9013a5fd8df47fa6b48b1e045f39816240c0b8fee8beadf4d8e9c0566c63a3e6e257f87329b18fae980078116',
          ),
        ],
        [
          BigInt(
            '0x1a0111ea397fe69a4b1ba7b6434bacd764774b84f38512bf6730d2a0f6b0f6241eabfffeb153ffffb9feffffffffaaaa',
          ),
          BigInt('0x0'),
        ],
        [
          BigInt(
            '0x00fc3e2b36c4e03288e9e902231f9fb854a14787b6c7b36fec0c8ec971f63c5f282d5ac14d6c7ec22cf78a126ddc4af3',
          ),
          BigInt(
            '0x1904d3bf02bb0667c231beb4202c0d1f0fd603fd3cbd5f4f7b2443d784bab9c4f67ea53d63e7813d8d0775ed92235fb8',
          ),
        ],
        [
          BigInt(
            '0x1a0111ea397fe699ec02408663d4de85aa0d857d89759ad4897d29650fb85f9b409427eb4f49fffd8bfd00000000aaac',
          ),
          BigInt('0x0'),
        ],
        [
          BigInt(
            '0x06af0e0437ff400b6831e36d6bd17ffe48395dabc2d3435e77f76e17009241c5ee67992f72ec05f4c81084fbede3cc09',
          ),
          BigInt(
            '0x135203e60180a68ee2e9c448d77a2cd91c3dedd930b1cf60ef396489f61eb45e304466cf3e67fa0af1ee7b04121bdea2',
          ),
        ],
        [
          BigInt(
            '0x1a0111ea397fe699ec02408663d4de85aa0d857d89759ad4897d29650fb85f9b409427eb4f49fffd8bfd00000000aaad',
          ),
          BigInt('0x0'),
        ],
        [
          BigInt(
            '0x05b2cfd9013a5fd8df47fa6b48b1e045f39816240c0b8fee8beadf4d8e9c0566c63a3e6e257f87329b18fae980078116',
          ),
          BigInt(
            '0x144e4211384586c16bd3ad4afa99cc9170df3560e77982d0db45f3536814f0bd5871c1908bd478cd1ee605167ff82995',
          ),
        ],
      ].map(n => Fp2.fromBigTuple(n));
      isogenyMapG2 = isogenyMap(
        Fp2,
        [
          // xNum
          [
            [
              '0x5c759507e8e333ebb5b7a9a47d7ed8532c52d39fd3a042a88b58423c50ae15d5c2638e343d9c71c6238aaaaaaaa97d6',
              '0x5c759507e8e333ebb5b7a9a47d7ed8532c52d39fd3a042a88b58423c50ae15d5c2638e343d9c71c6238aaaaaaaa97d6',
            ],
            [
              '0x0',
              '0x11560bf17baa99bc32126fced787c88f984f87adf7ae0c7f9a208c6b4f20a4181472aaa9cb8d555526a9ffffffffc71a',
            ],
            [
              '0x11560bf17baa99bc32126fced787c88f984f87adf7ae0c7f9a208c6b4f20a4181472aaa9cb8d555526a9ffffffffc71e',
              '0x8ab05f8bdd54cde190937e76bc3e447cc27c3d6fbd7063fcd104635a790520c0a395554e5c6aaaa9354ffffffffe38d',
            ],
            [
              '0x171d6541fa38ccfaed6dea691f5fb614cb14b4e7f4e810aa22d6108f142b85757098e38d0f671c7188e2aaaaaaaa5ed1',
              '0x0',
            ],
          ],
          // xDen
          [
            [
              '0x0',
              '0x1a0111ea397fe69a4b1ba7b6434bacd764774b84f38512bf6730d2a0f6b0f6241eabfffeb153ffffb9feffffffffaa63',
            ],
            [
              '0xc',
              '0x1a0111ea397fe69a4b1ba7b6434bacd764774b84f38512bf6730d2a0f6b0f6241eabfffeb153ffffb9feffffffffaa9f',
            ],
            ['0x1', '0x0'],
            // LAST 1
          ],
          // yNum
          [
            [
              '0x1530477c7ab4113b59a4c18b076d11930f7da5d4a07f649bf54439d87d27e500fc8c25ebf8c92f6812cfc71c71c6d706',
              '0x1530477c7ab4113b59a4c18b076d11930f7da5d4a07f649bf54439d87d27e500fc8c25ebf8c92f6812cfc71c71c6d706',
            ],
            [
              '0x0',
              '0x5c759507e8e333ebb5b7a9a47d7ed8532c52d39fd3a042a88b58423c50ae15d5c2638e343d9c71c6238aaaaaaaa97be',
            ],
            [
              '0x11560bf17baa99bc32126fced787c88f984f87adf7ae0c7f9a208c6b4f20a4181472aaa9cb8d555526a9ffffffffc71c',
              '0x8ab05f8bdd54cde190937e76bc3e447cc27c3d6fbd7063fcd104635a790520c0a395554e5c6aaaa9354ffffffffe38f',
            ],
            [
              '0x124c9ad43b6cf79bfbf7043de3811ad0761b0f37a1e26286b0e977c69aa274524e79097a56dc4bd9e1b371c71c718b10',
              '0x0',
            ],
          ],
          // yDen
          [
            [
              '0x1a0111ea397fe69a4b1ba7b6434bacd764774b84f38512bf6730d2a0f6b0f6241eabfffeb153ffffb9feffffffffa8fb',
              '0x1a0111ea397fe69a4b1ba7b6434bacd764774b84f38512bf6730d2a0f6b0f6241eabfffeb153ffffb9feffffffffa8fb',
            ],
            [
              '0x0',
              '0x1a0111ea397fe69a4b1ba7b6434bacd764774b84f38512bf6730d2a0f6b0f6241eabfffeb153ffffb9feffffffffa9d3',
            ],
            [
              '0x12',
              '0x1a0111ea397fe69a4b1ba7b6434bacd764774b84f38512bf6730d2a0f6b0f6241eabfffeb153ffffb9feffffffffaa99',
            ],
            ['0x1', '0x0'],
            // LAST 1
          ],
        ].map(i => i.map(pair => Fp2.fromBigTuple(pair.map(BigInt)))),
      );
      isogenyMapG1 = isogenyMap(
        Fp,
        [
          // xNum
          [
            '0x11a05f2b1e833340b809101dd99815856b303e88a2d7005ff2627b56cdb4e2c85610c2d5f2e62d6eaeac1662734649b7',
            '0x17294ed3e943ab2f0588bab22147a81c7c17e75b2f6a8417f565e33c70d1e86b4838f2a6f318c356e834eef1b3cb83bb',
            '0xd54005db97678ec1d1048c5d10a9a1bce032473295983e56878e501ec68e25c958c3e3d2a09729fe0179f9dac9edcb0',
            '0x1778e7166fcc6db74e0609d307e55412d7f5e4656a8dbf25f1b33289f1b330835336e25ce3107193c5b388641d9b6861',
            '0xe99726a3199f4436642b4b3e4118e5499db995a1257fb3f086eeb65982fac18985a286f301e77c451154ce9ac8895d9',
            '0x1630c3250d7313ff01d1201bf7a74ab5db3cb17dd952799b9ed3ab9097e68f90a0870d2dcae73d19cd13c1c66f652983',
            '0xd6ed6553fe44d296a3726c38ae652bfb11586264f0f8ce19008e218f9c86b2a8da25128c1052ecaddd7f225a139ed84',
            '0x17b81e7701abdbe2e8743884d1117e53356de5ab275b4db1a682c62ef0f2753339b7c8f8c8f475af9ccb5618e3f0c88e',
            '0x80d3cf1f9a78fc47b90b33563be990dc43b756ce79f5574a2c596c928c5d1de4fa295f296b74e956d71986a8497e317',
            '0x169b1f8e1bcfa7c42e0c37515d138f22dd2ecb803a0c5c99676314baf4bb1b7fa3190b2edc0327797f241067be390c9e',
            '0x10321da079ce07e272d8ec09d2565b0dfa7dccdde6787f96d50af36003b14866f69b771f8c285decca67df3f1605fb7b',
            '0x6e08c248e260e70bd1e962381edee3d31d79d7e22c837bc23c0bf1bc24c6b68c24b1b80b64d391fa9c8ba2e8ba2d229',
          ],
          // xDen
          [
            '0x8ca8d548cff19ae18b2e62f4bd3fa6f01d5ef4ba35b48ba9c9588617fc8ac62b558d681be343df8993cf9fa40d21b1c',
            '0x12561a5deb559c4348b4711298e536367041e8ca0cf0800c0126c2588c48bf5713daa8846cb026e9e5c8276ec82b3bff',
            '0xb2962fe57a3225e8137e629bff2991f6f89416f5a718cd1fca64e00b11aceacd6a3d0967c94fedcfcc239ba5cb83e19',
            '0x3425581a58ae2fec83aafef7c40eb545b08243f16b1655154cca8abc28d6fd04976d5243eecf5c4130de8938dc62cd8',
            '0x13a8e162022914a80a6f1d5f43e7a07dffdfc759a12062bb8d6b44e833b306da9bd29ba81f35781d539d395b3532a21e',
            '0xe7355f8e4e667b955390f7f0506c6e9395735e9ce9cad4d0a43bcef24b8982f7400d24bc4228f11c02df9a29f6304a5',
            '0x772caacf16936190f3e0c63e0596721570f5799af53a1894e2e073062aede9cea73b3538f0de06cec2574496ee84a3a',
            '0x14a7ac2a9d64a8b230b3f5b074cf01996e7f63c21bca68a81996e1cdf9822c580fa5b9489d11e2d311f7d99bbdcc5a5e',
            '0xa10ecf6ada54f825e920b3dafc7a3cce07f8d1d7161366b74100da67f39883503826692abba43704776ec3a79a1d641',
            '0x95fc13ab9e92ad4476d6e3eb3a56680f682b4ee96f7d03776df533978f31c1593174e4b4b7865002d6384d168ecdd0a',
            '0x000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001',
            // LAST 1
          ],
          // yNum
          [
            '0x90d97c81ba24ee0259d1f094980dcfa11ad138e48a869522b52af6c956543d3cd0c7aee9b3ba3c2be9845719707bb33',
            '0x134996a104ee5811d51036d776fb46831223e96c254f383d0f906343eb67ad34d6c56711962fa8bfe097e75a2e41c696',
            '0xcc786baa966e66f4a384c86a3b49942552e2d658a31ce2c344be4b91400da7d26d521628b00523b8dfe240c72de1f6',
            '0x1f86376e8981c217898751ad8746757d42aa7b90eeb791c09e4a3ec03251cf9de405aba9ec61deca6355c77b0e5f4cb',
            '0x8cc03fdefe0ff135caf4fe2a21529c4195536fbe3ce50b879833fd221351adc2ee7f8dc099040a841b6daecf2e8fedb',
            '0x16603fca40634b6a2211e11db8f0a6a074a7d0d4afadb7bd76505c3d3ad5544e203f6326c95a807299b23ab13633a5f0',
            '0x4ab0b9bcfac1bbcb2c977d027796b3ce75bb8ca2be184cb5231413c4d634f3747a87ac2460f415ec961f8855fe9d6f2',
            '0x987c8d5333ab86fde9926bd2ca6c674170a05bfe3bdd81ffd038da6c26c842642f64550fedfe935a15e4ca31870fb29',
            '0x9fc4018bd96684be88c9e221e4da1bb8f3abd16679dc26c1e8b6e6a1f20cabe69d65201c78607a360370e577bdba587',
            '0xe1bba7a1186bdb5223abde7ada14a23c42a0ca7915af6fe06985e7ed1e4d43b9b3f7055dd4eba6f2bafaaebca731c30',
            '0x19713e47937cd1be0dfd0b8f1d43fb93cd2fcbcb6caf493fd1183e416389e61031bf3a5cce3fbafce813711ad011c132',
            '0x18b46a908f36f6deb918c143fed2edcc523559b8aaf0c2462e6bfe7f911f643249d9cdf41b44d606ce07c8a4d0074d8e',
            '0xb182cac101b9399d155096004f53f447aa7b12a3426b08ec02710e807b4633f06c851c1919211f20d4c04f00b971ef8',
            '0x245a394ad1eca9b72fc00ae7be315dc757b3b080d4c158013e6632d3c40659cc6cf90ad1c232a6442d9d3f5db980133',
            '0x5c129645e44cf1102a159f748c4a3fc5e673d81d7e86568d9ab0f5d396a7ce46ba1049b6579afb7866b1e715475224b',
            '0x15e6be4e990f03ce4ea50b3b42df2eb5cb181d8f84965a3957add4fa95af01b2b665027efec01c7704b456be69c8b604',
          ],
          // yDen
          [
            '0x16112c4c3a9c98b252181140fad0eae9601a6de578980be6eec3232b5be72e7a07f3688ef60c206d01479253b03663c1',
            '0x1962d75c2381201e1a0cbd6c43c348b885c84ff731c4d59ca4a10356f453e01f78a4260763529e3532f6102c2e49a03d',
            '0x58df3306640da276faaae7d6e8eb15778c4855551ae7f310c35a5dd279cd2eca6757cd636f96f891e2538b53dbf67f2',
            '0x16b7d288798e5395f20d23bf89edb4d1d115c5dbddbcd30e123da489e726af41727364f2c28297ada8d26d98445f5416',
            '0xbe0e079545f43e4b00cc912f8228ddcc6d19c9f0f69bbb0542eda0fc9dec916a20b15dc0fd2ededda39142311a5001d',
            '0x8d9e5297186db2d9fb266eaac783182b70152c65550d881c5ecd87b6f0f5a6449f38db9dfa9cce202c6477faaf9b7ac',
            '0x166007c08a99db2fc3ba8734ace9824b5eecfdfa8d0cf8ef5dd365bc400a0051d5fa9c01a58b1fb93d1a1399126a775c',
            '0x16a3ef08be3ea7ea03bcddfabba6ff6ee5a4375efa1f4fd7feb34fd206357132b920f5b00801dee460ee415a15812ed9',
            '0x1866c8ed336c61231a1be54fd1d74cc4f9fb0ce4c6af5920abc5750c4bf39b4852cfe2f7bb9248836b233d9d55535d4a',
            '0x167a55cda70a6e1cea820597d94a84903216f763e13d87bb5308592e7ea7d4fbc7385ea3d529b35e346ef48bb8913f55',
            '0x4d2f259eea405bd48f010a01ad2911d9c6dd039bb61a6290e591b36e636a5c871a5c29f4f83060400f8b49cba8f6aa8',
            '0xaccbb67481d033ff5852c1e48c50c477f94ff8aefce42d28c0f9a88cea7913516f968986f7ebbea9684b529e2561092',
            '0xad6b9514c767fe3c3613144b45f1496543346d98adf02267d5ceef9a00d9b8693000763e3b90ac11e99b138573345cc',
            '0x2660400eb2e4f3b628bdd0d53cd76f2bf565b94e72927c1cb748df27942480e420517bd8714cc80d1fadc1326ed06f7',
            '0xe0fa1d816ddc03e6b24255e0d7819c171c40f65e273b853324efcd6356caa205ca2f570f13497804415473a1d634b8f',
            '0x000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001',
            // LAST 1
          ],
        ].map(i => i.map(j => BigInt(j))),
      );
      G2_SWU = mapToCurveSimpleSWU(Fp2, {
        A: Fp2.create({ c0: Fp.create(_0n5), c1: Fp.create(BigInt(240)) }),
        B: Fp2.create({ c0: Fp.create(BigInt(1012)), c1: Fp.create(BigInt(1012)) }),
        Z: Fp2.create({ c0: Fp.create(BigInt(-2)), c1: Fp.create(BigInt(-1)) }),
        // Z: -(2 + I)
      });
      G1_SWU = mapToCurveSimpleSWU(Fp, {
        A: Fp.create(
          BigInt(
            '0x144698a3b8e9433d693a02c96d4982b0ea985383ee66a8d8e8981aefd881ac98936f8da0e0f97f5cf428082d584c1d',
          ),
        ),
        B: Fp.create(
          BigInt(
            '0x12e2908d11688030018b12e8753eee3b2016c1f0f24f4070a0b9c14fcef35ef55a23215a316ceaa5d1cc48e98e172be0',
          ),
        ),
        Z: Fp.create(BigInt(11)),
      });
      ut_root = Fp6.create({ c0: Fp2.ZERO, c1: Fp2.ONE, c2: Fp2.ZERO });
      wsq = Fp12.create({ c0: ut_root, c1: Fp6.ZERO });
      wcu = Fp12.create({ c0: Fp6.ZERO, c1: ut_root });
      [wsq_inv, wcu_inv] = Fp12.invertBatch([wsq, wcu]);
      PSI2_C1 = BigInt(
        '0x1a0111ea397fe699ec02408663d4de85aa0d857d89759ad4897d29650fb85f9b409427eb4f49fffd8bfd00000000aaac',
      );
      htfDefaults = Object.freeze({
        // DST: a domain separation tag
        // defined in section 2.2.5
        // Use utils.getDSTLabel(), utils.setDSTLabel(value)
        DST: 'BLS_SIG_BLS12381G2_XMD:SHA-256_SSWU_RO_NUL_',
        encodeDST: 'BLS_SIG_BLS12381G2_XMD:SHA-256_SSWU_RO_NUL_',
        // p: the characteristic of F
        //    where F is a finite field of characteristic p and order q = p^m
        p: Fp.ORDER,
        // m: the extension degree of F, m >= 1
        //     where F is a finite field of characteristic p and order q = p^m
        m: 2,
        // k: the target security level for the suite in bits
        // defined in section 5.1
        k: 128,
        // option to use a message that has already been processed by
        // expand_message_xmd
        expand: 'xmd',
        // Hash functions for: expand_message_xmd is appropriate for use with a
        // wide range of hash functions, including SHA-2, SHA-3, BLAKE2, and others.
        // BBS+ uses blake2: https://github.com/hyperledger/aries-framework-go/issues/2247
        hash: sha256,
      });
      C_BIT_POS = Fp.BITS;
      I_BIT_POS = Fp.BITS + 1;
      S_BIT_POS = Fp.BITS + 2;
      COMPRESSED_ZERO = Fp.toBytes(bitSet(bitSet(_0n5, I_BIT_POS, true), S_BIT_POS, true));
      bls12_381 = bls({
        // Fields
        fields: {
          Fp,
          Fp2,
          Fp6,
          Fp12,
          Fr,
        },
        // G1 is the order-q subgroup of E1(Fp) : y² = x³ + 4, #E1(Fp) = h1q, where
        // characteristic; z + (z⁴ - z² + 1)(z - 1)²/3
        G1: {
          Fp,
          // cofactor; (z - 1)²/3
          h: BigInt('0x396c8c005555e1568c00aaab0000aaab'),
          // generator's coordinates
          // x = 3685416753713387016781088315183077757961620795782546409894578378688607592378376318836054947676345821548104185464507
          // y = 1339506544944476473020471379941921221584933875938349620426543736416511423956333506472724655353366534992391756441569
          Gx: BigInt(
            '0x17f1d3a73197d7942695638c4fa9ac0fc3688c4f9774b905a14e3a3f171bac586c55e83ff97a1aeffb3af00adb22c6bb',
          ),
          Gy: BigInt(
            '0x08b3f481e3aaa0f1a09e30ed741d8ae4fcf5e095d5d00af600db18cb2c04b3edd03cc744a2888ae40caa232946c5e7e1',
          ),
          a: Fp.ZERO,
          b: _4n3,
          htfDefaults: { ...htfDefaults, m: 1, DST: 'BLS_SIG_BLS12381G1_XMD:SHA-256_SSWU_RO_NUL_' },
          wrapPrivateKey: true,
          allowInfinityPoint: true,
          // Checks is the point resides in prime-order subgroup.
          // point.isTorsionFree() should return true for valid points
          // It returns false for shitty points.
          // https://eprint.iacr.org/2021/1130.pdf
          isTorsionFree: (c, point) => {
            const cubicRootOfUnityModP = BigInt(
              '0x5f19672fdf76ce51ba69c6076a0f77eaddb3a93be6f89688de17d813620a00022e01fffffffefffe',
            );
            const phi = new c(Fp.mul(point.px, cubicRootOfUnityModP), point.py, point.pz);
            const xP = point.multiplyUnsafe(bls12_381.params.x).negate();
            const u2P = xP.multiplyUnsafe(bls12_381.params.x);
            return u2P.equals(phi);
          },
          // Clear cofactor of G1
          // https://eprint.iacr.org/2019/403
          clearCofactor: (_c, point) => {
            return point.multiplyUnsafe(bls12_381.params.x).add(point);
          },
          mapToCurve: scalars => {
            const { x, y } = G1_SWU(Fp.create(scalars[0]));
            return isogenyMapG1(x, y);
          },
          fromBytes: bytes2 => {
            bytes2 = bytes2.slice();
            if (bytes2.length === 48) {
              const P = Fp.ORDER;
              const compressedValue = bytesToNumberBE(bytes2);
              const bflag = bitGet(compressedValue, I_BIT_POS);
              if (bflag === _1n5) return { x: _0n5, y: _0n5 };
              const x = Fp.create(compressedValue & Fp.MASK);
              const right = Fp.add(Fp.pow(x, _3n4), Fp.create(bls12_381.params.G1b));
              let y = Fp.sqrt(right);
              if (!y) throw new Error('Invalid compressed G1 point');
              const aflag = bitGet(compressedValue, C_BIT_POS);
              if ((y * _2n5) / P !== aflag) y = Fp.neg(y);
              return { x: Fp.create(x), y: Fp.create(y) };
            } else if (bytes2.length === 96) {
              if ((bytes2[0] & (1 << 6)) !== 0) return bls12_381.G1.ProjectivePoint.ZERO.toAffine();
              const x = bytesToNumberBE(bytes2.subarray(0, Fp.BYTES));
              const y = bytesToNumberBE(bytes2.subarray(Fp.BYTES));
              return { x: Fp.create(x), y: Fp.create(y) };
            } else {
              throw new Error('Invalid point G1, expected 48/96 bytes');
            }
          },
          toBytes: (c, point, isCompressed) => {
            const isZero = point.equals(c.ZERO);
            const { x, y } = point.toAffine();
            if (isCompressed) {
              if (isZero) return COMPRESSED_ZERO.slice();
              const P = Fp.ORDER;
              let num;
              num = bitSet(x, C_BIT_POS, Boolean((y * _2n5) / P));
              num = bitSet(num, S_BIT_POS, true);
              return numberToBytesBE(num, Fp.BYTES);
            } else {
              if (isZero) {
                const x2 = concatBytes(new Uint8Array([64]), new Uint8Array(2 * Fp.BYTES - 1));
                return x2;
              } else {
                return concatBytes(numberToBytesBE(x, Fp.BYTES), numberToBytesBE(y, Fp.BYTES));
              }
            }
          },
          ShortSignature: {
            fromHex(hex) {
              const bytes2 = ensureBytes('signatureHex', hex, 48);
              const P = Fp.ORDER;
              const compressedValue = bytesToNumberBE(bytes2);
              const bflag = bitGet(compressedValue, I_BIT_POS);
              if (bflag === _1n5) return bls12_381.G1.ProjectivePoint.ZERO;
              const x = Fp.create(compressedValue & Fp.MASK);
              const right = Fp.add(Fp.pow(x, _3n4), Fp.create(bls12_381.params.G1b));
              let y = Fp.sqrt(right);
              if (!y) throw new Error('Invalid compressed G1 point');
              const aflag = bitGet(compressedValue, C_BIT_POS);
              if ((y * _2n5) / P !== aflag) y = Fp.neg(y);
              const point = bls12_381.G1.ProjectivePoint.fromAffine({ x, y });
              point.assertValidity();
              return point;
            },
            toRawBytes(point) {
              return signatureG1ToRawBytes(point);
            },
            toHex(point) {
              return bytesToHex(signatureG1ToRawBytes(point));
            },
          },
        },
        // G2 is the order-q subgroup of E2(Fp²) : y² = x³+4(1+√−1),
        // where Fp2 is Fp[√−1]/(x2+1). #E2(Fp2 ) = h2q, where
        // G² - 1
        // h2q
        G2: {
          Fp: Fp2,
          // cofactor
          h: BigInt(
            '0x5d543a95414e7f1091d50792876a202cd91de4547085abaa68a205b2e5a7ddfa628f1cb4d9e82ef21537e293a6691ae1616ec6e786f0c70cf1c38e31c7238e5',
          ),
          Gx: Fp2.fromBigTuple([
            BigInt(
              '0x024aa2b2f08f0a91260805272dc51051c6e47ad4fa403b02b4510b647ae3d1770bac0326a805bbefd48056c8c121bdb8',
            ),
            BigInt(
              '0x13e02b6052719f607dacd3a088274f65596bd0d09920b61ab5da61bbdc7f5049334cf11213945d57e5ac7d055d042b7e',
            ),
          ]),
          // y =
          // 927553665492332455747201965776037880757740193453592970025027978793976877002675564980949289727957565575433344219582,
          // 1985150602287291935568054521177171638300868978215655730859378665066344726373823718423869104263333984641494340347905
          Gy: Fp2.fromBigTuple([
            BigInt(
              '0x0ce5d527727d6e118cc9cdc6da2e351aadfd9baa8cbdd3a76d429a695160d12c923ac9cc3baca289e193548608b82801',
            ),
            BigInt(
              '0x0606c4a02ea734cc32acd2b02bc28b99cb3e287e85a763af267492ab572e99ab3f370d275cec1da1aaa9075ff05f79be',
            ),
          ]),
          a: Fp2.ZERO,
          b: Fp2.fromBigTuple([_4n3, _4n3]),
          hEff: BigInt(
            '0xbc69f08f2ee75b3584c6a0ea91b352888e2a8e9145ad7689986ff031508ffe1329c2f178731db956d82bf015d1212b02ec0ec69d7477c1ae954cbc06689f6a359894c0adebbf6b4e8020005aaa95551',
          ),
          htfDefaults: { ...htfDefaults },
          wrapPrivateKey: true,
          allowInfinityPoint: true,
          mapToCurve: scalars => {
            const { x, y } = G2_SWU(Fp2.fromBigTuple(scalars));
            return isogenyMapG2(x, y);
          },
          // Checks is the point resides in prime-order subgroup.
          // point.isTorsionFree() should return true for valid points
          // It returns false for shitty points.
          // https://eprint.iacr.org/2021/1130.pdf
          isTorsionFree: (c, P) => {
            return P.multiplyUnsafe(bls12_381.params.x).negate().equals(G2psi(c, P));
          },
          // Maps the point into the prime-order subgroup G2.
          // clear_cofactor_bls12381_g2 from cfrg-hash-to-curve-11
          // https://eprint.iacr.org/2017/419.pdf
          // prettier-ignore
          clearCofactor: (c, P) => {
            const x = bls12_381.params.x;
            let t1 = P.multiplyUnsafe(x).negate();
            let t2 = G2psi(c, P);
            let t3 = P.double();
            t3 = G2psi2(c, t3);
            t3 = t3.subtract(t2);
            t2 = t1.add(t2);
            t2 = t2.multiplyUnsafe(x).negate();
            t3 = t3.add(t2);
            t3 = t3.subtract(t1);
            const Q = t3.subtract(P);
            return Q;
          },
          fromBytes: bytes2 => {
            bytes2 = bytes2.slice();
            const m_byte = bytes2[0] & 224;
            if (m_byte === 32 || m_byte === 96 || m_byte === 224) {
              throw new Error('Invalid encoding flag: ' + m_byte);
            }
            const bitC = m_byte & 128;
            const bitI = m_byte & 64;
            const bitS = m_byte & 32;
            const L = Fp.BYTES;
            const slc = (b, from, to) => bytesToNumberBE(b.slice(from, to));
            if (bytes2.length === 96 && bitC) {
              const b = bls12_381.params.G2b;
              const P = Fp.ORDER;
              bytes2[0] = bytes2[0] & 31;
              if (bitI) {
                if (bytes2.reduce((p, c) => (p !== 0 ? c + 1 : c), 0) > 0) {
                  throw new Error('Invalid compressed G2 point');
                }
                return { x: Fp2.ZERO, y: Fp2.ZERO };
              }
              const x_1 = slc(bytes2, 0, L);
              const x_0 = slc(bytes2, L, 2 * L);
              const x = Fp2.create({ c0: Fp.create(x_0), c1: Fp.create(x_1) });
              const right = Fp2.add(Fp2.pow(x, _3n4), b);
              let y = Fp2.sqrt(right);
              const Y_bit = y.c1 === _0n5 ? (y.c0 * _2n5) / P : (y.c1 * _2n5) / P ? _1n5 : _0n5;
              y = bitS > 0 && Y_bit > 0 ? y : Fp2.neg(y);
              return { x, y };
            } else if (bytes2.length === 192 && !bitC) {
              if ((bytes2[0] & (1 << 6)) !== 0) {
                return { x: Fp2.ZERO, y: Fp2.ZERO };
              }
              const x1 = slc(bytes2, 0, L);
              const x0 = slc(bytes2, L, 2 * L);
              const y1 = slc(bytes2, 2 * L, 3 * L);
              const y0 = slc(bytes2, 3 * L, 4 * L);
              return { x: Fp2.fromBigTuple([x0, x1]), y: Fp2.fromBigTuple([y0, y1]) };
            } else {
              throw new Error('Invalid point G2, expected 96/192 bytes');
            }
          },
          toBytes: (c, point, isCompressed) => {
            const { BYTES: len, ORDER: P } = Fp;
            const isZero = point.equals(c.ZERO);
            const { x, y } = point.toAffine();
            if (isCompressed) {
              if (isZero) return concatBytes(COMPRESSED_ZERO, numberToBytesBE(_0n5, len));
              const flag = Boolean(y.c1 === _0n5 ? (y.c0 * _2n5) / P : (y.c1 * _2n5) / P);
              let x_1 = bitSet(x.c1, C_BIT_POS, flag);
              x_1 = bitSet(x_1, S_BIT_POS, true);
              return concatBytes(numberToBytesBE(x_1, len), numberToBytesBE(x.c0, len));
            } else {
              if (isZero) return concatBytes(new Uint8Array([64]), new Uint8Array(4 * len - 1));
              const { re: x0, im: x1 } = Fp2.reim(x);
              const { re: y0, im: y1 } = Fp2.reim(y);
              return concatBytes(
                numberToBytesBE(x1, len),
                numberToBytesBE(x0, len),
                numberToBytesBE(y1, len),
                numberToBytesBE(y0, len),
              );
            }
          },
          Signature: {
            // TODO: Optimize, it's very slow because of sqrt.
            fromHex(hex) {
              hex = ensureBytes('signatureHex', hex);
              const P = Fp.ORDER;
              const half = hex.length / 2;
              if (half !== 48 && half !== 96)
                throw new Error('Invalid compressed signature length, must be 96 or 192');
              const z1 = bytesToNumberBE(hex.slice(0, half));
              const z2 = bytesToNumberBE(hex.slice(half));
              const bflag1 = bitGet(z1, I_BIT_POS);
              if (bflag1 === _1n5) return bls12_381.G2.ProjectivePoint.ZERO;
              const x1 = Fp.create(z1 & Fp.MASK);
              const x2 = Fp.create(z2);
              const x = Fp2.create({ c0: x2, c1: x1 });
              const y2 = Fp2.add(Fp2.pow(x, _3n4), bls12_381.params.G2b);
              let y = Fp2.sqrt(y2);
              if (!y) throw new Error('Failed to find a square root');
              const { re: y0, im: y1 } = Fp2.reim(y);
              const aflag1 = bitGet(z1, 381);
              const isGreater = y1 > _0n5 && (y1 * _2n5) / P !== aflag1;
              const isZero = y1 === _0n5 && (y0 * _2n5) / P !== aflag1;
              if (isGreater || isZero) y = Fp2.neg(y);
              const point = bls12_381.G2.ProjectivePoint.fromAffine({ x, y });
              point.assertValidity();
              return point;
            },
            toRawBytes(point) {
              return signatureG2ToRawBytes(point);
            },
            toHex(point) {
              return bytesToHex(signatureG2ToRawBytes(point));
            },
          },
        },
        params: {
          x: BLS_X,
          r: Fr.ORDER,
          // order; z⁴ − z² + 1; CURVE.n from other curves
        },
        htfDefaults,
        hash: sha256,
        randomBytes,
      });
    },
  });

  // index.js
  var require_bls = __commonJS({
    'index.js'(exports, module) {
      init_bls12_381();
      module.exports = {
        verifyShortSignature: bls12_381.verifyShortSignature,
      };
    },
  });
  return require_bls();
};
/*! Bundled license information:

@noble/hashes/esm/utils.js:
  (*! noble-hashes - MIT License (c) 2022 Paul Miller (paulmillr.com) *)

@noble/curves/esm/abstract/utils.js:
  (*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) *)

@noble/curves/esm/abstract/modular.js:
  (*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) *)

@noble/curves/esm/abstract/curve.js:
  (*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) *)

@noble/curves/esm/abstract/weierstrass.js:
  (*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) *)

@noble/curves/esm/bls12-381.js:
  (*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) *)
*/
