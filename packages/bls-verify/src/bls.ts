/*! noble-bls12-381 - MIT License (c) 2019 Paul Miller (paulmillr.com) */
import nodeCrypto from 'crypto';
import {
  Fp,
  Fr,
  Fp2,
  Fp12,
  CURVE,
  ProjectivePoint,
  map_to_curve_simple_swu_9mod16,
  isogenyMapG2,
  millerLoop,
  psi,
  psi2,
  calcPairingPrecomputes,
  mod,
} from './math';
export { Fp, Fr, Fp2, Fp12, CURVE };
const POW_2_381 = 2n ** 381n;
const POW_2_382 = POW_2_381 * 2n;
const POW_2_383 = POW_2_382 * 2n;
const PUBLIC_KEY_LENGTH = 48;
const SHA256_DIGEST_SIZE = 32;
const htfDefaults = {
  DST: 'BLS_SIG_BLS12381G2_XMD:SHA-256_SSWU_RO_NUL_',
  p: CURVE.P,
  m: 2,
  k: 128,
  expand: true,
};
function isWithinCurveOrder(num) {
  return 0 < num && num < CURVE.r;
}
const crypto = {
  node: nodeCrypto,
  web: typeof self === 'object' && 'crypto' in self ? self.crypto : undefined,
};
export const utils = {
  hashToField: hash_to_field,
  hashToPrivateKey: hash => {
    hash = ensureBytes(hash);
    if (hash.length < 40 || hash.length > 1024)
      throw new Error('Expected 40-1024 bytes of private key as per FIPS 186');
    const num = mod(bytesToNumberBE(hash), CURVE.r);
    if (num === 0n || num === 1n) throw new Error('Invalid private key');
    return numberTo32BytesBE(num);
  },
  bytesToHex,
  randomBytes: (bytesLength = 32) => {
    if (crypto.web) {
      return crypto.web.getRandomValues(new Uint8Array(bytesLength));
    } else if (crypto.node) {
      const { randomBytes } = crypto.node;
      return new Uint8Array(randomBytes(bytesLength).buffer);
    } else {
      throw new Error("The environment doesn't have randomBytes function");
    }
  },
  randomPrivateKey: () => {
    return utils.hashToPrivateKey(utils.randomBytes(40));
  },
  sha256: async message => {
    if (crypto.web) {
      const buffer = await crypto.web.subtle.digest('SHA-256', message.buffer);
      return new Uint8Array(buffer);
    } else if (crypto.node) {
      return Uint8Array.from(crypto.node.createHash('sha256').update(message).digest());
    } else {
      throw new Error("The environment doesn't have sha256 function");
    }
  },
  mod,
  getDSTLabel() {
    return htfDefaults.DST;
  },
  setDSTLabel(newLabel) {
    if (typeof newLabel !== 'string' || newLabel.length > 2048 || newLabel.length === 0) {
      throw new TypeError('Invalid DST');
    }
    htfDefaults.DST = newLabel;
  },
};
function bytesToNumberBE(uint8a) {
  if (!(uint8a instanceof Uint8Array)) throw new Error('Expected Uint8Array');
  return BigInt('0x' + bytesToHex(Uint8Array.from(uint8a)));
}
const hexes = Array.from({ length: 256 }, (v, i) => i.toString(16).padStart(2, '0'));
function bytesToHex(uint8a) {
  let hex = '';
  for (let i = 0; i < uint8a.length; i++) {
    hex += hexes[uint8a[i]];
  }
  return hex;
}
function hexToBytes(hex) {
  if (typeof hex !== 'string') {
    throw new TypeError('hexToBytes: expected string, got ' + typeof hex);
  }
  if (hex.length % 2) throw new Error('hexToBytes: received invalid unpadded hex');
  const array = new Uint8Array(hex.length / 2);
  for (let i = 0; i < array.length; i++) {
    const j = i * 2;
    const hexByte = hex.slice(j, j + 2);
    if (hexByte.length !== 2) throw new Error('Invalid byte sequence');
    const byte = Number.parseInt(hexByte, 16);
    if (Number.isNaN(byte) || byte < 0) throw new Error('Invalid byte sequence');
    array[i] = byte;
  }
  return array;
}
function numberTo32BytesBE(num) {
  const length = 32;
  const hex = num.toString(16).padStart(length * 2, '0');
  return hexToBytes(hex);
}
function toPaddedHex(num, padding) {
  if (typeof num !== 'bigint' || num < 0n) throw new Error('Expected valid bigint');
  if (typeof padding !== 'number') throw new TypeError('Expected valid padding');
  return num.toString(16).padStart(padding * 2, '0');
}
function ensureBytes(hex) {
  return hex instanceof Uint8Array ? Uint8Array.from(hex) : hexToBytes(hex);
}
function concatBytes(...arrays) {
  if (arrays.length === 1) return arrays[0];
  const length = arrays.reduce((a, arr) => a + arr.length, 0);
  const result = new Uint8Array(length);
  for (let i = 0, pad = 0; i < arrays.length; i++) {
    const arr = arrays[i];
    result.set(arr, pad);
    pad += arr.length;
  }
  return result;
}
function stringToBytes(str) {
  const bytes = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) {
    bytes[i] = str.charCodeAt(i);
  }
  return bytes;
}
function os2ip(bytes) {
  let result = 0n;
  for (let i = 0; i < bytes.length; i++) {
    result <<= 8n;
    result += BigInt(bytes[i]);
  }
  return result;
}
function i2osp(value, length) {
  if (value < 0 || value >= 1 << (8 * length)) {
    throw new Error(`bad I2OSP call: value=${value} length=${length}`);
  }
  const res = Array.from({ length }).fill(0);
  for (let i = length - 1; i >= 0; i--) {
    res[i] = value & 0xff;
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
async function expand_message_xmd(msg, DST, lenInBytes) {
  const H = utils.sha256;
  const b_in_bytes = SHA256_DIGEST_SIZE;
  const r_in_bytes = b_in_bytes * 2;
  const ell = Math.ceil(lenInBytes / b_in_bytes);
  if (ell > 255) throw new Error('Invalid xmd length');
  const DST_prime = concatBytes(DST, i2osp(DST.length, 1));
  const Z_pad = i2osp(0, r_in_bytes);
  const l_i_b_str = i2osp(lenInBytes, 2);
  const b = new Array(ell);
  const b_0 = await H(concatBytes(Z_pad, msg, l_i_b_str, i2osp(0, 1), DST_prime));
  b[0] = await H(concatBytes(b_0, i2osp(1, 1), DST_prime));
  for (let i = 1; i <= ell; i++) {
    const args = [strxor(b_0, b[i - 1]), i2osp(i + 1, 1), DST_prime];
    b[i] = await H(concatBytes(...args));
  }
  const pseudo_random_bytes = concatBytes(...b);
  return pseudo_random_bytes.slice(0, lenInBytes);
}
async function hash_to_field(msg, count, options = {}) {
  const htfOptions = { ...htfDefaults, ...options };
  const log2p = htfOptions.p.toString(2).length;
  const L = Math.ceil((log2p + htfOptions.k) / 8);
  const len_in_bytes = count * htfOptions.m * L;
  const DST = stringToBytes(htfOptions.DST);
  let pseudo_random_bytes = msg;
  if (htfOptions.expand) {
    pseudo_random_bytes = await expand_message_xmd(msg, DST, len_in_bytes);
  }
  const u = new Array(count);
  for (let i = 0; i < count; i++) {
    const e = new Array(htfOptions.m);
    for (let j = 0; j < htfOptions.m; j++) {
      const elm_offset = L * (j + i * htfOptions.m);
      const tv = pseudo_random_bytes.slice(elm_offset, elm_offset + L);
      e[j] = mod(os2ip(tv), htfOptions.p);
    }
    u[i] = e;
  }
  return u;
}
function normalizePrivKey(key) {
  let int;
  if (key instanceof Uint8Array && key.length === 32) int = bytesToNumberBE(key);
  else if (typeof key === 'string' && key.length === 64) int = BigInt(`0x${key}`);
  else if (typeof key === 'number' && key > 0 && Number.isSafeInteger(key)) int = BigInt(key);
  else if (typeof key === 'bigint' && key > 0n) int = key;
  else throw new TypeError('Expected valid private key');
  int = mod(int, CURVE.r);
  if (!isWithinCurveOrder(int)) throw new Error('Private key must be 0 < key < CURVE.r');
  return int;
}
function assertType(item, type) {
  if (!(item instanceof type)) throw new Error('Expected Fp* argument, not number/bigint');
}
export class PointG1 extends ProjectivePoint {
  constructor(x, y, z = Fp.ONE) {
    super(x, y, z, Fp);
    assertType(x, Fp);
    assertType(y, Fp);
    assertType(z, Fp);
  }
  static fromHex(bytes) {
    bytes = ensureBytes(bytes);
    let point;
    if (bytes.length === 48) {
      const { P } = CURVE;
      const compressedValue = bytesToNumberBE(bytes);
      const bflag = mod(compressedValue, POW_2_383) / POW_2_382;
      if (bflag === 1n) {
        return this.ZERO;
      }
      const x = new Fp(mod(compressedValue, POW_2_381));
      const right = x.pow(3n).add(new Fp(CURVE.b));
      let y = right.sqrt();
      if (!y) throw new Error('Invalid compressed G1 point');
      const aflag = mod(compressedValue, POW_2_382) / POW_2_381;
      if ((y.value * 2n) / P !== aflag) y = y.negate();
      point = new PointG1(x, y);
    } else if (bytes.length === 96) {
      if ((bytes[0] & (1 << 6)) !== 0) return PointG1.ZERO;
      const x = bytesToNumberBE(bytes.slice(0, PUBLIC_KEY_LENGTH));
      const y = bytesToNumberBE(bytes.slice(PUBLIC_KEY_LENGTH));
      point = new PointG1(new Fp(x), new Fp(y));
    } else {
      throw new Error('Invalid point G1, expected 48/96 bytes');
    }
    point.assertValidity();
    return point;
  }
  static fromPrivateKey(privateKey) {
    return this.BASE.multiplyPrecomputed(normalizePrivKey(privateKey));
  }
  toRawBytes(isCompressed = false) {
    return hexToBytes(this.toHex(isCompressed));
  }
  toHex(isCompressed = false) {
    this.assertValidity();
    if (isCompressed) {
      const { P } = CURVE;
      let hex;
      if (this.isZero()) {
        hex = POW_2_383 + POW_2_382;
      } else {
        const [x, y] = this.toAffine();
        const flag = (y.value * 2n) / P;
        hex = x.value + flag * POW_2_381 + POW_2_383;
      }
      return toPaddedHex(hex, PUBLIC_KEY_LENGTH);
    } else {
      if (this.isZero()) {
        return '4'.padEnd(2 * 2 * PUBLIC_KEY_LENGTH, '0');
      } else {
        const [x, y] = this.toAffine();
        return toPaddedHex(x.value, PUBLIC_KEY_LENGTH) + toPaddedHex(y.value, PUBLIC_KEY_LENGTH);
      }
    }
  }
  assertValidity() {
    if (this.isZero()) return this;
    // if (!this.isOnCurve()) throw new Error('Invalid G1 point: not on curve Fp');
    // if (!this.isTorsionFree()) throw new Error('Invalid G1 point: must be of prime-order subgroup');
    return this;
  }
  [Symbol.for('nodejs.util.inspect.custom')]() {
    return this.toString();
  }
  millerLoop(P) {
    return millerLoop(P.pairingPrecomputes(), this.toAffine());
  }
  clearCofactor() {
    const t = this.mulCurveMinusX();
    return t.add(this);
  }
  isOnCurve() {
    const b = new Fp(CURVE.b);
    const { x, y, z } = this;
    const left = y.pow(2n).multiply(z).subtract(x.pow(3n));
    const right = b.multiply(z.pow(3n));
    return left.subtract(right).isZero();
  }
  sigma() {
    const BETA =
      0x1a0111ea397fe699ec02408663d4de85aa0d857d89759ad4897d29650fb85f9b409427eb4f49fffd8bfd00000000aaacn;
    const [x, y] = this.toAffine();
    return new PointG1(x.multiply(BETA), y);
  }
  phi() {
    const cubicRootOfUnityModP =
      0x5f19672fdf76ce51ba69c6076a0f77eaddb3a93be6f89688de17d813620a00022e01fffffffefffen;
    return new PointG1(this.x.multiply(cubicRootOfUnityModP), this.y, this.z);
  }
  mulCurveX() {
    return this.multiplyUnsafe(CURVE.x).negate();
  }
  mulCurveMinusX() {
    return this.multiplyUnsafe(CURVE.x);
  }
  isTorsionFree() {
    const xP = this.mulCurveX();
    const u2P = xP.mulCurveMinusX();
    return u2P.equals(this.phi());
  }
}
PointG1.BASE = new PointG1(new Fp(CURVE.Gx), new Fp(CURVE.Gy), Fp.ONE);
PointG1.ZERO = new PointG1(Fp.ONE, Fp.ONE, Fp.ZERO);
export class PointG2 extends ProjectivePoint {
  constructor(x, y, z = Fp2.ONE) {
    super(x, y, z, Fp2);
    assertType(x, Fp2);
    assertType(y, Fp2);
    assertType(z, Fp2);
  }
  static async hashToCurve(msg) {
    msg = ensureBytes(msg);
    const u = await hash_to_field(msg, 2);
    const Q0 = new PointG2(...isogenyMapG2(map_to_curve_simple_swu_9mod16(u[0])));
    const Q1 = new PointG2(...isogenyMapG2(map_to_curve_simple_swu_9mod16(u[1])));
    const R = Q0.add(Q1);
    const P = R.clearCofactor();
    return P;
  }
  static fromSignature(hex) {
    hex = ensureBytes(hex);
    const { P } = CURVE;
    const half = hex.length / 2;
    if (half !== 48 && half !== 96)
      throw new Error('Invalid compressed signature length, must be 96 or 192');
    const z1 = bytesToNumberBE(hex.slice(0, half));
    const z2 = bytesToNumberBE(hex.slice(half));
    const bflag1 = mod(z1, POW_2_383) / POW_2_382;
    if (bflag1 === 1n) return this.ZERO;
    const x1 = new Fp(z1 % POW_2_381);
    const x2 = new Fp(z2);
    const x = new Fp2(x2, x1);
    const y2 = x.pow(3n).add(Fp2.fromBigTuple(CURVE.b2));
    let y = y2.sqrt();
    if (!y) throw new Error('Failed to find a square root');
    const { re: y0, im: y1 } = y.reim();
    const aflag1 = (z1 % POW_2_382) / POW_2_381;
    const isGreater = y1 > 0n && (y1 * 2n) / P !== aflag1;
    const isZero = y1 === 0n && (y0 * 2n) / P !== aflag1;
    if (isGreater || isZero) y = y.multiply(-1n);
    const point = new PointG2(x, y, Fp2.ONE);
    point.assertValidity();
    return point;
  }
  static fromHex(bytes) {
    bytes = ensureBytes(bytes);
    const m_byte = bytes[0] & 0xe0;
    if (m_byte === 0x20 || m_byte === 0x60 || m_byte === 0xe0) {
      throw new Error('Invalid encoding flag: ' + m_byte);
    }
    const bitC = m_byte & 0x80;
    const bitI = m_byte & 0x40;
    const bitS = m_byte & 0x20;
    let point;
    if (bytes.length === 96 && bitC) {
      const { P, b2 } = CURVE;
      const b = Fp2.fromBigTuple(b2);
      bytes[0] = bytes[0] & 0x1f;
      if (bitI) {
        if (bytes.reduce((p, c) => (p !== 0 ? c + 1 : c), 0) > 0) {
          throw new Error('Invalid compressed G2 point');
        }
        return PointG2.ZERO;
      }
      const x_1 = bytesToNumberBE(bytes.slice(0, PUBLIC_KEY_LENGTH));
      const x_0 = bytesToNumberBE(bytes.slice(PUBLIC_KEY_LENGTH));
      const x = new Fp2(new Fp(x_0), new Fp(x_1));
      const right = x.pow(3n).add(b);
      let y = right.sqrt();
      if (!y) throw new Error('Invalid compressed G2 point');
      const Y_bit = y.c1.value === 0n ? (y.c0.value * 2n) / P : (y.c1.value * 2n) / P ? 1n : 0n;
      y = bitS > 0 && Y_bit > 0 ? y : y.negate();
      return new PointG2(x, y);
    } else if (bytes.length === 192 && !bitC) {
      if ((bytes[0] & (1 << 6)) !== 0) {
        return PointG2.ZERO;
      }
      const x1 = bytesToNumberBE(bytes.slice(0, PUBLIC_KEY_LENGTH));
      const x0 = bytesToNumberBE(bytes.slice(PUBLIC_KEY_LENGTH, 2 * PUBLIC_KEY_LENGTH));
      const y1 = bytesToNumberBE(bytes.slice(2 * PUBLIC_KEY_LENGTH, 3 * PUBLIC_KEY_LENGTH));
      const y0 = bytesToNumberBE(bytes.slice(3 * PUBLIC_KEY_LENGTH));
      point = new PointG2(Fp2.fromBigTuple([x0, x1]), Fp2.fromBigTuple([y0, y1]));
    } else {
      throw new Error('Invalid point G2, expected 96/192 bytes');
    }
    point.assertValidity();
    return point;
  }
  static fromPrivateKey(privateKey) {
    return this.BASE.multiplyPrecomputed(normalizePrivKey(privateKey));
  }
  toSignature() {
    if (this.equals(PointG2.ZERO)) {
      const sum = POW_2_383 + POW_2_382;
      const h = toPaddedHex(sum, PUBLIC_KEY_LENGTH) + toPaddedHex(0n, PUBLIC_KEY_LENGTH);
      return hexToBytes(h);
    }
    const [{ re: x0, im: x1 }, { re: y0, im: y1 }] = this.toAffine().map(a => a.reim());
    const tmp = y1 > 0n ? y1 * 2n : y0 * 2n;
    const aflag1 = tmp / CURVE.P;
    const z1 = x1 + aflag1 * POW_2_381 + POW_2_383;
    const z2 = x0;
    return hexToBytes(toPaddedHex(z1, PUBLIC_KEY_LENGTH) + toPaddedHex(z2, PUBLIC_KEY_LENGTH));
  }
  toRawBytes(isCompressed = false) {
    return hexToBytes(this.toHex(isCompressed));
  }
  toHex(isCompressed = false) {
    this.assertValidity();
    if (isCompressed) {
      const { P } = CURVE;
      let x_1 = 0n;
      let x_0 = 0n;
      if (this.isZero()) {
        x_1 = POW_2_383 + POW_2_382;
      } else {
        const [x, y] = this.toAffine();
        const flag = y.c1.value === 0n ? (y.c0.value * 2n) / P : (y.c1.value * 2n) / P ? 1n : 0n;
        x_1 = x.c1.value + flag * POW_2_381 + POW_2_383;
        x_0 = x.c0.value;
      }
      return toPaddedHex(x_1, PUBLIC_KEY_LENGTH) + toPaddedHex(x_0, PUBLIC_KEY_LENGTH);
    } else {
      if (this.equals(PointG2.ZERO)) {
        return '4'.padEnd(2 * 4 * PUBLIC_KEY_LENGTH, '0');
      }
      const [{ re: x0, im: x1 }, { re: y0, im: y1 }] = this.toAffine().map(a => a.reim());
      return (
        toPaddedHex(x1, PUBLIC_KEY_LENGTH) +
        toPaddedHex(x0, PUBLIC_KEY_LENGTH) +
        toPaddedHex(y1, PUBLIC_KEY_LENGTH) +
        toPaddedHex(y0, PUBLIC_KEY_LENGTH)
      );
    }
  }
  assertValidity() {
    if (this.isZero()) return this;
    if (!this.isOnCurve()) throw new Error('Invalid G2 point: not on curve Fp2');
    if (!this.isTorsionFree()) throw new Error('Invalid G2 point: must be of prime-order subgroup');
    return this;
  }
  psi() {
    return this.fromAffineTuple(psi(...this.toAffine()));
  }
  psi2() {
    return this.fromAffineTuple(psi2(...this.toAffine()));
  }
  mulCurveX() {
    return this.multiplyUnsafe(CURVE.x).negate();
  }
  clearCofactor() {
    const P = this;
    let t1 = P.mulCurveX();
    let t2 = P.psi();
    let t3 = P.double();
    t3 = t3.psi2();
    t3 = t3.subtract(t2);
    t2 = t1.add(t2);
    t2 = t2.mulCurveX();
    t3 = t3.add(t2);
    t3 = t3.subtract(t1);
    const Q = t3.subtract(P);
    return Q;
  }
  isOnCurve() {
    const b = Fp2.fromBigTuple(CURVE.b2);
    const { x, y, z } = this;
    const left = y.pow(2n).multiply(z).subtract(x.pow(3n));
    const right = b.multiply(z.pow(3n));
    return left.subtract(right).isZero();
  }
  isTorsionFree() {
    const P = this;
    return P.mulCurveX().equals(P.psi());
  }
  [Symbol.for('nodejs.util.inspect.custom')]() {
    return this.toString();
  }
  clearPairingPrecomputes() {
    this._PPRECOMPUTES = undefined;
  }
  pairingPrecomputes() {
    if (this._PPRECOMPUTES) return this._PPRECOMPUTES;
    this._PPRECOMPUTES = calcPairingPrecomputes(...this.toAffine());
    return this._PPRECOMPUTES;
  }
}
PointG2.BASE = new PointG2(Fp2.fromBigTuple(CURVE.G2x), Fp2.fromBigTuple(CURVE.G2y), Fp2.ONE);
PointG2.ZERO = new PointG2(Fp2.ONE, Fp2.ONE, Fp2.ZERO);
export function pairing(P, Q, withFinalExponent = true) {
  if (P.isZero() || Q.isZero()) throw new Error('No pairings at point of Infinity');
  P.assertValidity();
  Q.assertValidity();
  const looped = P.millerLoop(Q);
  return withFinalExponent ? looped.finalExponentiate() : looped;
}
function normP1(point) {
  return point instanceof PointG1 ? point : PointG1.fromHex(point);
}
function normP2(point) {
  return point instanceof PointG2 ? point : PointG2.fromSignature(point);
}
async function normP2Hash(point) {
  return point instanceof PointG2 ? point : PointG2.hashToCurve(point);
}
export function getPublicKey(privateKey) {
  return PointG1.fromPrivateKey(privateKey).toRawBytes(true);
}
export async function sign(message, privateKey) {
  const msgPoint = await normP2Hash(message);
  msgPoint.assertValidity();
  const sigPoint = msgPoint.multiply(normalizePrivKey(privateKey));
  if (message instanceof PointG2) return sigPoint;
  return sigPoint.toSignature();
}
export async function verify(signature, message, publicKey) {
  const P = normP1(publicKey);
  const Hm = await normP2Hash(message);
  const G = PointG1.BASE;
  const S = normP2(signature);
  const ePHm = pairing(P.negate(), Hm, false);
  const eGS = pairing(G, S, false);
  const exp = eGS.multiply(ePHm).finalExponentiate();
  return exp.equals(Fp12.ONE);
}
export function aggregatePublicKeys(publicKeys) {
  if (!publicKeys.length) throw new Error('Expected non-empty array');
  const agg = publicKeys.map(normP1).reduce((sum, p) => sum.add(p), PointG1.ZERO);
  if (publicKeys[0] instanceof PointG1) return agg.assertValidity();
  return agg.toRawBytes(true);
}
export function aggregateSignatures(signatures) {
  if (!signatures.length) throw new Error('Expected non-empty array');
  const agg = signatures.map(normP2).reduce((sum, s) => sum.add(s), PointG2.ZERO);
  if (signatures[0] instanceof PointG2) return agg.assertValidity();
  return agg.toSignature();
}
export async function verifyBatch(signature, messages, publicKeys) {
  if (!messages.length) throw new Error('Expected non-empty messages array');
  if (publicKeys.length !== messages.length) throw new Error('Pubkey count should equal msg count');
  const sig = normP2(signature);
  const nMessages = await Promise.all(messages.map(normP2Hash));
  const nPublicKeys = publicKeys.map(normP1);
  try {
    const paired = [];
    for (const message of new Set(nMessages)) {
      const groupPublicKey = nMessages.reduce(
        (groupPublicKey, subMessage, i) =>
          subMessage === message ? groupPublicKey.add(nPublicKeys[i]) : groupPublicKey,
        PointG1.ZERO,
      );
      paired.push(pairing(groupPublicKey, message, false));
    }
    paired.push(pairing(PointG1.BASE.negate(), sig, false));
    const product = paired.reduce((a, b) => a.multiply(b), Fp12.ONE);
    const exp = product.finalExponentiate();
    return exp.equals(Fp12.ONE);
  } catch {
    return false;
  }
}
PointG1.BASE.calcMultiplyPrecomputes(4);
