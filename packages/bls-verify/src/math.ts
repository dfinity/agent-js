export const CURVE = {
  P: 0x1a0111ea397fe69a4b1ba7b6434bacd764774b84f38512bf6730d2a0f6b0f6241eabfffeb153ffffb9feffffffffaaabn,
  r: 0x73eda753299d7d483339d80809a1d80553bda402fffe5bfeffffffff00000001n,
  h: 0x396c8c005555e1568c00aaab0000aaabn,
  Gx: 0x17f1d3a73197d7942695638c4fa9ac0fc3688c4f9774b905a14e3a3f171bac586c55e83ff97a1aeffb3af00adb22c6bbn,
  Gy: 0x08b3f481e3aaa0f1a09e30ed741d8ae4fcf5e095d5d00af600db18cb2c04b3edd03cc744a2888ae40caa232946c5e7e1n,
  b: 4n,
  P2:
    0x1a0111ea397fe69a4b1ba7b6434bacd764774b84f38512bf6730d2a0f6b0f6241eabfffeb153ffffb9feffffffffaaabn **
      2n -
    1n,
  h2: 0x5d543a95414e7f1091d50792876a202cd91de4547085abaa68a205b2e5a7ddfa628f1cb4d9e82ef21537e293a6691ae1616ec6e786f0c70cf1c38e31c7238e5n,
  G2x: [
    0x024aa2b2f08f0a91260805272dc51051c6e47ad4fa403b02b4510b647ae3d1770bac0326a805bbefd48056c8c121bdb8n,
    0x13e02b6052719f607dacd3a088274f65596bd0d09920b61ab5da61bbdc7f5049334cf11213945d57e5ac7d055d042b7en,
  ],
  G2y: [
    0x0ce5d527727d6e118cc9cdc6da2e351aadfd9baa8cbdd3a76d429a695160d12c923ac9cc3baca289e193548608b82801n,
    0x0606c4a02ea734cc32acd2b02bc28b99cb3e287e85a763af267492ab572e99ab3f370d275cec1da1aaa9075ff05f79ben,
  ],
  b2: [4n, 4n],
  x: 0xd201000000010000n,
  h2Eff:
    0xbc69f08f2ee75b3584c6a0ea91b352888e2a8e9145ad7689986ff031508ffe1329c2f178731db956d82bf015d1212b02ec0ec69d7477c1ae954cbc06689f6a359894c0adebbf6b4e8020005aaa95551n,
};
const BLS_X_LEN = bitLen(CURVE.x);
export function mod(a, b) {
  const res = a % b;
  return res >= 0n ? res : b + res;
}
export function powMod(num, power, modulo) {
  if (modulo <= 0n || power < 0n) throw new Error('Expected power/modulo > 0');
  if (modulo === 1n) return 0n;
  let res = 1n;
  while (power > 0n) {
    if (power & 1n) res = (res * num) % modulo;
    num = (num * num) % modulo;
    power >>= 1n;
  }
  return res;
}
function genInvertBatch(cls, nums) {
  const tmp = new Array(nums.length);
  const lastMultiplied = nums.reduce((acc, num, i) => {
    if (num.isZero()) return acc;
    tmp[i] = acc;
    return acc.multiply(num);
  }, cls.ONE);
  const inverted = lastMultiplied.invert();
  nums.reduceRight((acc, num, i) => {
    if (num.isZero()) return acc;
    tmp[i] = acc.multiply(tmp[i]);
    return acc.multiply(num);
  }, inverted);
  return tmp;
}
function bitLen(n) {
  let len;
  for (len = 0; n > 0n; n >>= 1n, len += 1);
  return len;
}
function bitGet(n, pos) {
  return (n >> BigInt(pos)) & 1n;
}
function invert(number, modulo = CURVE.P) {
  const _0n = 0n;
  const _1n = 1n;
  if (number === _0n || modulo <= _0n) {
    throw new Error(`invert: expected positive integers, got n=${number} mod=${modulo}`);
  }
  let a = mod(number, modulo);
  let b = modulo;
  let x = _0n,
    y = _1n,
    u = _1n,
    v = _0n;
  while (a !== _0n) {
    const q = b / a;
    const r = b % a;
    const m = x - u * q;
    const n = y - v * q;
    (b = a), (a = r), (x = u), (y = v), (u = m), (v = n);
  }
  const gcd = b;
  if (gcd !== _1n) throw new Error('invert: does not exist');
  return mod(x, modulo);
}
export class Fp {
  constructor(value) {
    this.value = mod(value, Fp.ORDER);
  }
  isZero() {
    return this.value === 0n;
  }
  equals(rhs) {
    return this.value === rhs.value;
  }
  negate() {
    return new Fp(-this.value);
  }
  invert() {
    return new Fp(invert(this.value, Fp.ORDER));
  }
  add(rhs) {
    return new Fp(this.value + rhs.value);
  }
  square() {
    return new Fp(this.value * this.value);
  }
  pow(n) {
    return new Fp(powMod(this.value, n, Fp.ORDER));
  }
  sqrt() {
    const root = this.pow((Fp.ORDER + 1n) / 4n);
    if (!root.square().equals(this)) return;
    return root;
  }
  subtract(rhs) {
    return new Fp(this.value - rhs.value);
  }
  multiply(rhs) {
    if (rhs instanceof Fp) rhs = rhs.value;
    return new Fp(this.value * rhs);
  }
  div(rhs) {
    if (typeof rhs === 'bigint') rhs = new Fp(rhs);
    return this.multiply(rhs.invert());
  }
  toString() {
    const str = this.value.toString(16).padStart(96, '0');
    return str.slice(0, 2) + '.' + str.slice(-2);
  }
}
Fp.ORDER = CURVE.P;
Fp.MAX_BITS = bitLen(CURVE.P);
Fp.ZERO = new Fp(0n);
Fp.ONE = new Fp(1n);
export class Fr {
  constructor(value) {
    this.value = mod(value, Fr.ORDER);
  }
  static isValid(b) {
    return b <= Fr.ORDER;
  }
  isZero() {
    return this.value === 0n;
  }
  equals(rhs) {
    return this.value === rhs.value;
  }
  negate() {
    return new Fr(-this.value);
  }
  invert() {
    return new Fr(invert(this.value, Fr.ORDER));
  }
  add(rhs) {
    return new Fr(this.value + rhs.value);
  }
  square() {
    return new Fr(this.value * this.value);
  }
  pow(n) {
    return new Fr(powMod(this.value, n, Fr.ORDER));
  }
  subtract(rhs) {
    return new Fr(this.value - rhs.value);
  }
  multiply(rhs) {
    if (rhs instanceof Fr) rhs = rhs.value;
    return new Fr(this.value * rhs);
  }
  div(rhs) {
    if (typeof rhs === 'bigint') rhs = new Fr(rhs);
    return this.multiply(rhs.invert());
  }
  legendre() {
    return this.pow((Fr.ORDER - 1n) / 2n);
  }
  sqrt() {
    if (!this.legendre().equals(Fr.ONE)) return;
    const P = Fr.ORDER;
    let q, s, z;
    for (q = P - 1n, s = 0; q % 2n === 0n; q /= 2n, s++);
    if (s === 1) return this.pow((P + 1n) / 4n);
    for (z = 2n; z < P && new Fr(z).legendre().value !== P - 1n; z++);
    let c = powMod(z, q, P);
    let r = powMod(this.value, (q + 1n) / 2n, P);
    let t = powMod(this.value, q, P);
    let t2 = 0n;
    while (mod(t - 1n, P) !== 0n) {
      t2 = mod(t * t, P);
      let i;
      for (i = 1; i < s; i++) {
        if (mod(t2 - 1n, P) === 0n) break;
        t2 = mod(t2 * t2, P);
      }
      let b = powMod(c, BigInt(1 << (s - i - 1)), P);
      r = mod(r * b, P);
      c = mod(b * b, P);
      t = mod(t * c, P);
      s = i;
    }
    return new Fr(r);
  }
  toString() {
    return '0x' + this.value.toString(16).padStart(64, '0');
  }
}
Fr.ORDER = CURVE.r;
Fr.ZERO = new Fr(0n);
Fr.ONE = new Fr(1n);
function powMod_FQP(fqp, fqpOne, n) {
  const elm = fqp;
  if (n === 0n) return fqpOne;
  if (n === 1n) return elm;
  let p = fqpOne;
  let d = elm;
  while (n > 0n) {
    if (n & 1n) p = p.multiply(d);
    n >>= 1n;
    d = d.square();
  }
  return p;
}
export class Fp2 {
  constructor(c0, c1) {
    this.c0 = c0;
    this.c1 = c1;
    if (typeof c0 === 'bigint') throw new Error('c0: Expected Fp');
    if (typeof c1 === 'bigint') throw new Error('c1: Expected Fp');
  }
  static fromBigTuple(tuple) {
    const fps = tuple.map(n => new Fp(n));
    return new Fp2(...fps);
  }
  one() {
    return Fp2.ONE;
  }
  isZero() {
    return this.c0.isZero() && this.c1.isZero();
  }
  toString() {
    return `Fp2(${this.c0} + ${this.c1}×i)`;
  }
  reim() {
    return { re: this.c0.value, im: this.c1.value };
  }
  negate() {
    const { c0, c1 } = this;
    return new Fp2(c0.negate(), c1.negate());
  }
  equals(rhs) {
    const { c0, c1 } = this;
    const { c0: r0, c1: r1 } = rhs;
    return c0.equals(r0) && c1.equals(r1);
  }
  add(rhs) {
    const { c0, c1 } = this;
    const { c0: r0, c1: r1 } = rhs;
    return new Fp2(c0.add(r0), c1.add(r1));
  }
  subtract(rhs) {
    const { c0, c1 } = this;
    const { c0: r0, c1: r1 } = rhs;
    return new Fp2(c0.subtract(r0), c1.subtract(r1));
  }
  multiply(rhs) {
    const { c0, c1 } = this;
    if (typeof rhs === 'bigint') {
      return new Fp2(c0.multiply(rhs), c1.multiply(rhs));
    }
    const { c0: r0, c1: r1 } = rhs;
    let t1 = c0.multiply(r0);
    let t2 = c1.multiply(r1);
    return new Fp2(t1.subtract(t2), c0.add(c1).multiply(r0.add(r1)).subtract(t1.add(t2)));
  }
  pow(n) {
    return powMod_FQP(this, Fp2.ONE, n);
  }
  div(rhs) {
    const inv = typeof rhs === 'bigint' ? new Fp(rhs).invert().value : rhs.invert();
    return this.multiply(inv);
  }
  mulByNonresidue() {
    const c0 = this.c0;
    const c1 = this.c1;
    return new Fp2(c0.subtract(c1), c0.add(c1));
  }
  square() {
    const c0 = this.c0;
    const c1 = this.c1;
    const a = c0.add(c1);
    const b = c0.subtract(c1);
    const c = c0.add(c0);
    return new Fp2(a.multiply(b), c.multiply(c1));
  }
  sqrt() {
    const candidateSqrt = this.pow((Fp2.ORDER + 8n) / 16n);
    const check = candidateSqrt.square().div(this);
    const R = FP2_ROOTS_OF_UNITY;
    const divisor = [R[0], R[2], R[4], R[6]].find(r => r.equals(check));
    if (!divisor) return;
    const index = R.indexOf(divisor);
    const root = R[index / 2];
    if (!root) throw new Error('Invalid root');
    const x1 = candidateSqrt.div(root);
    const x2 = x1.negate();
    const { re: re1, im: im1 } = x1.reim();
    const { re: re2, im: im2 } = x2.reim();
    if (im1 > im2 || (im1 === im2 && re1 > re2)) return x1;
    return x2;
  }
  invert() {
    const { re: a, im: b } = this.reim();
    const factor = new Fp(a * a + b * b).invert();
    return new Fp2(factor.multiply(new Fp(a)), factor.multiply(new Fp(-b)));
  }
  frobeniusMap(power) {
    return new Fp2(this.c0, this.c1.multiply(FP2_FROBENIUS_COEFFICIENTS[power % 2]));
  }
  multiplyByB() {
    let c0 = this.c0;
    let c1 = this.c1;
    let t0 = c0.multiply(4n);
    let t1 = c1.multiply(4n);
    return new Fp2(t0.subtract(t1), t0.add(t1));
  }
}
Fp2.ORDER = CURVE.P2;
Fp2.MAX_BITS = bitLen(CURVE.P2);
Fp2.ZERO = new Fp2(Fp.ZERO, Fp.ZERO);
Fp2.ONE = new Fp2(Fp.ONE, Fp.ZERO);
export class Fp6 {
  constructor(c0, c1, c2) {
    this.c0 = c0;
    this.c1 = c1;
    this.c2 = c2;
  }
  static fromBigSix(t) {
    if (!Array.isArray(t) || t.length !== 6) throw new Error('Invalid Fp6 usage');
    const c = [t.slice(0, 2), t.slice(2, 4), t.slice(4, 6)].map(t => Fp2.fromBigTuple(t));
    return new Fp6(...c);
  }
  fromTriple(triple) {
    return new Fp6(...triple);
  }
  one() {
    return Fp6.ONE;
  }
  isZero() {
    return this.c0.isZero() && this.c1.isZero() && this.c2.isZero();
  }
  negate() {
    const { c0, c1, c2 } = this;
    return new Fp6(c0.negate(), c1.negate(), c2.negate());
  }
  toString() {
    return `Fp6(${this.c0} + ${this.c1} * v, ${this.c2} * v^2)`;
  }
  equals(rhs) {
    const { c0, c1, c2 } = this;
    const { c0: r0, c1: r1, c2: r2 } = rhs;
    return c0.equals(r0) && c1.equals(r1) && c2.equals(r2);
  }
  add(rhs) {
    const { c0, c1, c2 } = this;
    const { c0: r0, c1: r1, c2: r2 } = rhs;
    return new Fp6(c0.add(r0), c1.add(r1), c2.add(r2));
  }
  subtract(rhs) {
    const { c0, c1, c2 } = this;
    const { c0: r0, c1: r1, c2: r2 } = rhs;
    return new Fp6(c0.subtract(r0), c1.subtract(r1), c2.subtract(r2));
  }
  multiply(rhs) {
    if (typeof rhs === 'bigint') {
      return new Fp6(this.c0.multiply(rhs), this.c1.multiply(rhs), this.c2.multiply(rhs));
    }
    let { c0, c1, c2 } = this;
    let { c0: r0, c1: r1, c2: r2 } = rhs;
    let t0 = c0.multiply(r0);
    let t1 = c1.multiply(r1);
    let t2 = c2.multiply(r2);
    return new Fp6(
      t0.add(c1.add(c2).multiply(r1.add(r2)).subtract(t1.add(t2)).mulByNonresidue()),
      c0.add(c1).multiply(r0.add(r1)).subtract(t0.add(t1)).add(t2.mulByNonresidue()),
      t1.add(c0.add(c2).multiply(r0.add(r2)).subtract(t0.add(t2))),
    );
  }
  pow(n) {
    return powMod_FQP(this, Fp6.ONE, n);
  }
  div(rhs) {
    const inv = typeof rhs === 'bigint' ? new Fp(rhs).invert().value : rhs.invert();
    return this.multiply(inv);
  }
  mulByNonresidue() {
    return new Fp6(this.c2.mulByNonresidue(), this.c0, this.c1);
  }
  multiplyBy1(b1) {
    return new Fp6(
      this.c2.multiply(b1).mulByNonresidue(),
      this.c0.multiply(b1),
      this.c1.multiply(b1),
    );
  }
  multiplyBy01(b0, b1) {
    let { c0, c1, c2 } = this;
    let t0 = c0.multiply(b0);
    let t1 = c1.multiply(b1);
    return new Fp6(
      c1.add(c2).multiply(b1).subtract(t1).mulByNonresidue().add(t0),
      b0.add(b1).multiply(c0.add(c1)).subtract(t0).subtract(t1),
      c0.add(c2).multiply(b0).subtract(t0).add(t1),
    );
  }
  multiplyByFp2(rhs) {
    let { c0, c1, c2 } = this;
    return new Fp6(c0.multiply(rhs), c1.multiply(rhs), c2.multiply(rhs));
  }
  square() {
    let { c0, c1, c2 } = this;
    let t0 = c0.square();
    let t1 = c0.multiply(c1).multiply(2n);
    let t3 = c1.multiply(c2).multiply(2n);
    let t4 = c2.square();
    return new Fp6(
      t3.mulByNonresidue().add(t0),
      t4.mulByNonresidue().add(t1),
      t1.add(c0.subtract(c1).add(c2).square()).add(t3).subtract(t0).subtract(t4),
    );
  }
  invert() {
    let { c0, c1, c2 } = this;
    let t0 = c0.square().subtract(c2.multiply(c1).mulByNonresidue());
    let t1 = c2.square().mulByNonresidue().subtract(c0.multiply(c1));
    let t2 = c1.square().subtract(c0.multiply(c2));
    let t4 = c2.multiply(t1).add(c1.multiply(t2)).mulByNonresidue().add(c0.multiply(t0)).invert();
    return new Fp6(t4.multiply(t0), t4.multiply(t1), t4.multiply(t2));
  }
  frobeniusMap(power) {
    return new Fp6(
      this.c0.frobeniusMap(power),
      this.c1.frobeniusMap(power).multiply(FP6_FROBENIUS_COEFFICIENTS_1[power % 6]),
      this.c2.frobeniusMap(power).multiply(FP6_FROBENIUS_COEFFICIENTS_2[power % 6]),
    );
  }
}
Fp6.ZERO = new Fp6(Fp2.ZERO, Fp2.ZERO, Fp2.ZERO);
Fp6.ONE = new Fp6(Fp2.ONE, Fp2.ZERO, Fp2.ZERO);
export class Fp12 {
  constructor(c0, c1) {
    this.c0 = c0;
    this.c1 = c1;
  }
  static fromBigTwelve(t) {
    return new Fp12(Fp6.fromBigSix(t.slice(0, 6)), Fp6.fromBigSix(t.slice(6, 12)));
  }
  fromTuple(c) {
    return new Fp12(...c);
  }
  one() {
    return Fp12.ONE;
  }
  isZero() {
    return this.c0.isZero() && this.c1.isZero();
  }
  toString() {
    return `Fp12(${this.c0} + ${this.c1} * w)`;
  }
  negate() {
    const { c0, c1 } = this;
    return new Fp12(c0.negate(), c1.negate());
  }
  equals(rhs) {
    const { c0, c1 } = this;
    const { c0: r0, c1: r1 } = rhs;
    return c0.equals(r0) && c1.equals(r1);
  }
  add(rhs) {
    const { c0, c1 } = this;
    const { c0: r0, c1: r1 } = rhs;
    return new Fp12(c0.add(r0), c1.add(r1));
  }
  subtract(rhs) {
    const { c0, c1 } = this;
    const { c0: r0, c1: r1 } = rhs;
    return new Fp12(c0.subtract(r0), c1.subtract(r1));
  }
  multiply(rhs) {
    if (typeof rhs === 'bigint') return new Fp12(this.c0.multiply(rhs), this.c1.multiply(rhs));
    let { c0, c1 } = this;
    let { c0: r0, c1: r1 } = rhs;
    let t1 = c0.multiply(r0);
    let t2 = c1.multiply(r1);
    return new Fp12(
      t1.add(t2.mulByNonresidue()),
      c0.add(c1).multiply(r0.add(r1)).subtract(t1.add(t2)),
    );
  }
  pow(n) {
    return powMod_FQP(this, Fp12.ONE, n);
  }
  div(rhs) {
    const inv = typeof rhs === 'bigint' ? new Fp(rhs).invert().value : rhs.invert();
    return this.multiply(inv);
  }
  multiplyBy014(o0, o1, o4) {
    let { c0, c1 } = this;
    let t0 = c0.multiplyBy01(o0, o1);
    let t1 = c1.multiplyBy1(o4);
    return new Fp12(
      t1.mulByNonresidue().add(t0),
      c1.add(c0).multiplyBy01(o0, o1.add(o4)).subtract(t0).subtract(t1),
    );
  }
  multiplyByFp2(rhs) {
    return new Fp12(this.c0.multiplyByFp2(rhs), this.c1.multiplyByFp2(rhs));
  }
  square() {
    let { c0, c1 } = this;
    let ab = c0.multiply(c1);
    return new Fp12(
      c1.mulByNonresidue().add(c0).multiply(c0.add(c1)).subtract(ab).subtract(ab.mulByNonresidue()),
      ab.add(ab),
    );
  }
  invert() {
    let { c0, c1 } = this;
    let t = c0.square().subtract(c1.square().mulByNonresidue()).invert();
    return new Fp12(c0.multiply(t), c1.multiply(t).negate());
  }
  conjugate() {
    return new Fp12(this.c0, this.c1.negate());
  }
  frobeniusMap(power) {
    const r0 = this.c0.frobeniusMap(power);
    const { c0, c1, c2 } = this.c1.frobeniusMap(power);
    const coeff = FP12_FROBENIUS_COEFFICIENTS[power % 12];
    return new Fp12(r0, new Fp6(c0.multiply(coeff), c1.multiply(coeff), c2.multiply(coeff)));
  }
  Fp4Square(a, b) {
    const a2 = a.square();
    const b2 = b.square();
    return {
      first: b2.mulByNonresidue().add(a2),
      second: a.add(b).square().subtract(a2).subtract(b2),
    };
  }
  cyclotomicSquare() {
    const { c0: c0c0, c1: c0c1, c2: c0c2 } = this.c0;
    const { c0: c1c0, c1: c1c1, c2: c1c2 } = this.c1;
    const { first: t3, second: t4 } = this.Fp4Square(c0c0, c1c1);
    const { first: t5, second: t6 } = this.Fp4Square(c1c0, c0c2);
    const { first: t7, second: t8 } = this.Fp4Square(c0c1, c1c2);
    let t9 = t8.mulByNonresidue();
    return new Fp12(
      new Fp6(
        t3.subtract(c0c0).multiply(2n).add(t3),
        t5.subtract(c0c1).multiply(2n).add(t5),
        t7.subtract(c0c2).multiply(2n).add(t7),
      ),
      new Fp6(
        t9.add(c1c0).multiply(2n).add(t9),
        t4.add(c1c1).multiply(2n).add(t4),
        t6.add(c1c2).multiply(2n).add(t6),
      ),
    );
  }
  cyclotomicExp(n) {
    let z = Fp12.ONE;
    for (let i = BLS_X_LEN - 1; i >= 0; i--) {
      z = z.cyclotomicSquare();
      if (bitGet(n, i)) z = z.multiply(this);
    }
    return z;
  }
  finalExponentiate() {
    const { x } = CURVE;
    const t0 = this.frobeniusMap(6).div(this);
    const t1 = t0.frobeniusMap(2).multiply(t0);
    const t2 = t1.cyclotomicExp(x).conjugate();
    const t3 = t1.cyclotomicSquare().conjugate().multiply(t2);
    const t4 = t3.cyclotomicExp(x).conjugate();
    const t5 = t4.cyclotomicExp(x).conjugate();
    const t6 = t5.cyclotomicExp(x).conjugate().multiply(t2.cyclotomicSquare());
    const t7 = t6.cyclotomicExp(x).conjugate();
    const t2_t5_pow_q2 = t2.multiply(t5).frobeniusMap(2);
    const t4_t1_pow_q3 = t4.multiply(t1).frobeniusMap(3);
    const t6_t1c_pow_q1 = t6.multiply(t1.conjugate()).frobeniusMap(1);
    const t7_t3c_t1 = t7.multiply(t3.conjugate()).multiply(t1);
    return t2_t5_pow_q2.multiply(t4_t1_pow_q3).multiply(t6_t1c_pow_q1).multiply(t7_t3c_t1);
  }
}
Fp12.ZERO = new Fp12(Fp6.ZERO, Fp6.ZERO);
Fp12.ONE = new Fp12(Fp6.ONE, Fp6.ZERO);
export class ProjectivePoint {
  constructor(x, y, z, C) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.C = C;
  }
  isZero() {
    return this.z.isZero();
  }
  createPoint(x, y, z) {
    return new this.constructor(x, y, z);
  }
  getZero() {
    return this.createPoint(this.C.ONE, this.C.ONE, this.C.ZERO);
  }
  equals(rhs) {
    if (this.constructor !== rhs.constructor)
      throw new Error(
        `ProjectivePoint#equals: this is ${this.constructor}, but rhs is ${rhs.constructor}`,
      );
    const a = this;
    const b = rhs;
    const xe = a.x.multiply(b.z).equals(b.x.multiply(a.z));
    const ye = a.y.multiply(b.z).equals(b.y.multiply(a.z));
    return xe && ye;
  }
  negate() {
    return this.createPoint(this.x, this.y.negate(), this.z);
  }
  toString(isAffine = true) {
    if (this.isZero()) {
      return `Point<Zero>`;
    }
    if (!isAffine) {
      return `Point<x=${this.x}, y=${this.y}, z=${this.z}>`;
    }
    const [x, y] = this.toAffine();
    return `Point<x=${x}, y=${y}>`;
  }
  fromAffineTuple(xy) {
    return this.createPoint(xy[0], xy[1], this.C.ONE);
  }
  toAffine(invZ = this.z.invert()) {
    if (invZ.isZero()) throw new Error('Invalid inverted z');
    return [this.x.multiply(invZ), this.y.multiply(invZ)];
  }
  toAffineBatch(points) {
    const toInv = genInvertBatch(
      this.C,
      points.map(p => p.z),
    );
    return points.map((p, i) => p.toAffine(toInv[i]));
  }
  normalizeZ(points) {
    return this.toAffineBatch(points).map(t => this.fromAffineTuple(t));
  }
  double() {
    const { x, y, z } = this;
    const W = x.multiply(x).multiply(3n);
    const S = y.multiply(z);
    const SS = S.multiply(S);
    const SSS = SS.multiply(S);
    const B = x.multiply(y).multiply(S);
    const H = W.multiply(W).subtract(B.multiply(8n));
    const X3 = H.multiply(S).multiply(2n);
    const Y3 = W.multiply(B.multiply(4n).subtract(H)).subtract(
      y.multiply(y).multiply(8n).multiply(SS),
    );
    const Z3 = SSS.multiply(8n);
    return this.createPoint(X3, Y3, Z3);
  }
  add(rhs) {
    if (this.constructor !== rhs.constructor)
      throw new Error(
        `ProjectivePoint#add: this is ${this.constructor}, but rhs is ${rhs.constructor}`,
      );
    const p1 = this;
    const p2 = rhs;
    if (p1.isZero()) return p2;
    if (p2.isZero()) return p1;
    const X1 = p1.x;
    const Y1 = p1.y;
    const Z1 = p1.z;
    const X2 = p2.x;
    const Y2 = p2.y;
    const Z2 = p2.z;
    const U1 = Y2.multiply(Z1);
    const U2 = Y1.multiply(Z2);
    const V1 = X2.multiply(Z1);
    const V2 = X1.multiply(Z2);
    if (V1.equals(V2) && U1.equals(U2)) return this.double();
    if (V1.equals(V2)) return this.getZero();
    const U = U1.subtract(U2);
    const V = V1.subtract(V2);
    const VV = V.multiply(V);
    const VVV = VV.multiply(V);
    const V2VV = V2.multiply(VV);
    const W = Z1.multiply(Z2);
    const A = U.multiply(U).multiply(W).subtract(VVV).subtract(V2VV.multiply(2n));
    const X3 = V.multiply(A);
    const Y3 = U.multiply(V2VV.subtract(A)).subtract(VVV.multiply(U2));
    const Z3 = VVV.multiply(W);
    return this.createPoint(X3, Y3, Z3);
  }
  subtract(rhs) {
    if (this.constructor !== rhs.constructor)
      throw new Error(
        `ProjectivePoint#subtract: this is ${this.constructor}, but rhs is ${rhs.constructor}`,
      );
    return this.add(rhs.negate());
  }
  validateScalar(n) {
    if (typeof n === 'number') n = BigInt(n);
    if (typeof n !== 'bigint' || n <= 0 || n > CURVE.r) {
      throw new Error(
        `Point#multiply: invalid scalar, expected positive integer < CURVE.r. Got: ${n}`,
      );
    }
    return n;
  }
  multiplyUnsafe(scalar) {
    let n = this.validateScalar(scalar);
    let point = this.getZero();
    let d = this;
    while (n > 0n) {
      if (n & 1n) point = point.add(d);
      d = d.double();
      n >>= 1n;
    }
    return point;
  }
  multiply(scalar) {
    let n = this.validateScalar(scalar);
    let point = this.getZero();
    let fake = this.getZero();
    let d = this;
    let bits = Fp.ORDER;
    while (bits > 0n) {
      if (n & 1n) {
        point = point.add(d);
      } else {
        fake = fake.add(d);
      }
      d = d.double();
      n >>= 1n;
      bits >>= 1n;
    }
    return point;
  }
  maxBits() {
    return this.C.MAX_BITS;
  }
  precomputeWindow(W) {
    const windows = Math.ceil(this.maxBits() / W);
    const windowSize = 2 ** (W - 1);
    let points = [];
    let p = this;
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
  }
  calcMultiplyPrecomputes(W) {
    if (this._MPRECOMPUTES) throw new Error('This point already has precomputes');
    this._MPRECOMPUTES = [W, this.normalizeZ(this.precomputeWindow(W))];
  }
  clearMultiplyPrecomputes() {
    this._MPRECOMPUTES = undefined;
  }
  wNAF(n) {
    let W, precomputes;
    if (this._MPRECOMPUTES) {
      [W, precomputes] = this._MPRECOMPUTES;
    } else {
      W = 1;
      precomputes = this.precomputeWindow(W);
    }
    let p = this.getZero();
    let f = this.getZero();
    const windows = Math.ceil(this.maxBits() / W);
    const windowSize = 2 ** (W - 1);
    const mask = BigInt(2 ** W - 1);
    const maxNumber = 2 ** W;
    const shiftBy = BigInt(W);
    for (let window = 0; window < windows; window++) {
      const offset = window * windowSize;
      let wbits = Number(n & mask);
      n >>= shiftBy;
      if (wbits > windowSize) {
        wbits -= maxNumber;
        n += 1n;
      }
      if (wbits === 0) {
        f = f.add(window % 2 ? precomputes[offset].negate() : precomputes[offset]);
      } else {
        const cached = precomputes[offset + Math.abs(wbits) - 1];
        p = p.add(wbits < 0 ? cached.negate() : cached);
      }
    }
    return [p, f];
  }
  multiplyPrecomputed(scalar) {
    return this.wNAF(this.validateScalar(scalar))[0];
  }
}
function sgn0(x) {
  const { re: x0, im: x1 } = x.reim();
  const sign_0 = x0 % 2n;
  const zero_0 = x0 === 0n;
  const sign_1 = x1 % 2n;
  return BigInt(sign_0 || (zero_0 && sign_1));
}
const P_MINUS_9_DIV_16 = (CURVE.P ** 2n - 9n) / 16n;
function sqrt_div_fp2(u, v) {
  const v7 = v.pow(7n);
  const uv7 = u.multiply(v7);
  const uv15 = uv7.multiply(v7.multiply(v));
  const gamma = uv15.pow(P_MINUS_9_DIV_16).multiply(uv7);
  let success = false;
  let result = gamma;
  const positiveRootsOfUnity = FP2_ROOTS_OF_UNITY.slice(0, 4);
  positiveRootsOfUnity.forEach(root => {
    const candidate = root.multiply(gamma);
    if (candidate.pow(2n).multiply(v).subtract(u).isZero() && !success) {
      success = true;
      result = candidate;
    }
  });
  return { success, sqrtCandidateOrGamma: result };
}
export function map_to_curve_simple_swu_9mod16(t) {
  const iso_3_a = new Fp2(new Fp(0n), new Fp(240n));
  const iso_3_b = new Fp2(new Fp(1012n), new Fp(1012n));
  const iso_3_z = new Fp2(new Fp(-2n), new Fp(-1n));
  if (Array.isArray(t)) t = Fp2.fromBigTuple(t);
  const t2 = t.pow(2n);
  const iso_3_z_t2 = iso_3_z.multiply(t2);
  const ztzt = iso_3_z_t2.add(iso_3_z_t2.pow(2n));
  let denominator = iso_3_a.multiply(ztzt).negate();
  let numerator = iso_3_b.multiply(ztzt.add(Fp2.ONE));
  if (denominator.isZero()) denominator = iso_3_z.multiply(iso_3_a);
  let v = denominator.pow(3n);
  let u = numerator
    .pow(3n)
    .add(iso_3_a.multiply(numerator).multiply(denominator.pow(2n)))
    .add(iso_3_b.multiply(v));
  const { success, sqrtCandidateOrGamma } = sqrt_div_fp2(u, v);
  let y;
  if (success) y = sqrtCandidateOrGamma;
  const sqrtCandidateX1 = sqrtCandidateOrGamma.multiply(t.pow(3n));
  u = iso_3_z_t2.pow(3n).multiply(u);
  let success2 = false;
  FP2_ETAs.forEach(eta => {
    const etaSqrtCandidate = eta.multiply(sqrtCandidateX1);
    const temp = etaSqrtCandidate.pow(2n).multiply(v).subtract(u);
    if (temp.isZero() && !success && !success2) {
      y = etaSqrtCandidate;
      success2 = true;
    }
  });
  if (!success && !success2) throw new Error('Hash to Curve - Optimized SWU failure');
  if (success2) numerator = numerator.multiply(iso_3_z_t2);
  y = y;
  if (sgn0(t) !== sgn0(y)) y = y.negate();
  y = y.multiply(denominator);
  return [numerator, y, denominator];
}
export function isogenyMapG2(xyz) {
  const x = xyz[0],
    y = xyz[1],
    z = xyz[2];
  const zz = z.multiply(z);
  const zzz = zz.multiply(z);
  const zPowers = [z, zz, zzz];
  const mapped = [Fp2.ZERO, Fp2.ZERO, Fp2.ZERO, Fp2.ZERO];
  for (let i = 0; i < ISOGENY_COEFFICIENTS.length; i++) {
    const k_i = ISOGENY_COEFFICIENTS[i];
    mapped[i] = k_i.slice(-1)[0];
    const arr = k_i.slice(0, -1).reverse();
    for (let j = 0; j < arr.length; j++) {
      const k_i_j = arr[j];
      mapped[i] = mapped[i].multiply(x).add(zPowers[j].multiply(k_i_j));
    }
  }
  mapped[2] = mapped[2].multiply(y);
  mapped[3] = mapped[3].multiply(z);
  const z2 = mapped[1].multiply(mapped[3]);
  const x2 = mapped[0].multiply(mapped[3]);
  const y2 = mapped[1].multiply(mapped[2]);
  return [x2, y2, z2];
}
export function calcPairingPrecomputes(x, y) {
  const Qx = x,
    Qy = y,
    Qz = Fp2.ONE;
  let Rx = Qx,
    Ry = Qy,
    Rz = Qz;
  let ell_coeff = [];
  for (let i = BLS_X_LEN - 2; i >= 0; i--) {
    let t0 = Ry.square();
    let t1 = Rz.square();
    let t2 = t1.multiply(3n).multiplyByB();
    let t3 = t2.multiply(3n);
    let t4 = Ry.add(Rz).square().subtract(t1).subtract(t0);
    ell_coeff.push([t2.subtract(t0), Rx.square().multiply(3n), t4.negate()]);
    Rx = t0.subtract(t3).multiply(Rx).multiply(Ry).div(2n);
    Ry = t0.add(t3).div(2n).square().subtract(t2.square().multiply(3n));
    Rz = t0.multiply(t4);
    if (bitGet(CURVE.x, i)) {
      let t0 = Ry.subtract(Qy.multiply(Rz));
      let t1 = Rx.subtract(Qx.multiply(Rz));
      ell_coeff.push([t0.multiply(Qx).subtract(t1.multiply(Qy)), t0.negate(), t1]);
      let t2 = t1.square();
      let t3 = t2.multiply(t1);
      let t4 = t2.multiply(Rx);
      let t5 = t3.subtract(t4.multiply(2n)).add(t0.square().multiply(Rz));
      Rx = t1.multiply(t5);
      Ry = t4.subtract(t5).multiply(t0).subtract(t3.multiply(Ry));
      Rz = Rz.multiply(t3);
    }
  }
  return ell_coeff;
}
export function millerLoop(ell, g1) {
  const Px = g1[0].value;
  const Py = g1[1].value;
  let f12 = Fp12.ONE;
  for (let j = 0, i = BLS_X_LEN - 2; i >= 0; i--, j++) {
    const E = ell[j];
    f12 = f12.multiplyBy014(E[0], E[1].multiply(Px), E[2].multiply(Py));
    if (bitGet(CURVE.x, i)) {
      j += 1;
      const F = ell[j];
      f12 = f12.multiplyBy014(F[0], F[1].multiply(Px), F[2].multiply(Py));
    }
    if (i !== 0) f12 = f12.square();
  }
  return f12.conjugate();
}
const ut_root = new Fp6(Fp2.ZERO, Fp2.ONE, Fp2.ZERO);
const wsq = new Fp12(ut_root, Fp6.ZERO);
const wcu = new Fp12(Fp6.ZERO, ut_root);
const [wsq_inv, wcu_inv] = genInvertBatch(Fp12, [wsq, wcu]);
export function psi(x, y) {
  const x2 = wsq_inv.multiplyByFp2(x).frobeniusMap(1).multiply(wsq).c0.c0;
  const y2 = wcu_inv.multiplyByFp2(y).frobeniusMap(1).multiply(wcu).c0.c0;
  return [x2, y2];
}
export function psi2(x, y) {
  return [x.multiply(PSI2_C1), y.negate()];
}
const PSI2_C1 =
  0x1a0111ea397fe699ec02408663d4de85aa0d857d89759ad4897d29650fb85f9b409427eb4f49fffd8bfd00000000aaacn;
const rv1 =
  0x6af0e0437ff400b6831e36d6bd17ffe48395dabc2d3435e77f76e17009241c5ee67992f72ec05f4c81084fbede3cc09n;
const ev1 =
  0x699be3b8c6870965e5bf892ad5d2cc7b0e85a117402dfd83b7f4a947e02d978498255a2aaec0ac627b5afbdf1bf1c90n;
const ev2 =
  0x8157cd83046453f5dd0972b6e3949e4288020b5b8a9cc99ca07e27089a2ce2436d965026adad3ef7baba37f2183e9b5n;
const ev3 =
  0xab1c2ffdd6c253ca155231eb3e71ba044fd562f6f72bc5bad5ec46a0b7a3b0247cf08ce6c6317f40edbc653a72dee17n;
const ev4 =
  0xaa404866706722864480885d68ad0ccac1967c7544b447873cc37e0181271e006df72162a3d3e0287bf597fbf7f8fc1n;
const FP2_FROBENIUS_COEFFICIENTS = [
  0x1n,
  0x1a0111ea397fe69a4b1ba7b6434bacd764774b84f38512bf6730d2a0f6b0f6241eabfffeb153ffffb9feffffffffaaaan,
].map(item => new Fp(item));
const FP2_ROOTS_OF_UNITY = [
  [1n, 0n],
  [rv1, -rv1],
  [0n, 1n],
  [rv1, rv1],
  [-1n, 0n],
  [-rv1, rv1],
  [0n, -1n],
  [-rv1, -rv1],
].map(pair => Fp2.fromBigTuple(pair));
const FP2_ETAs = [
  [ev1, ev2],
  [-ev2, ev1],
  [ev3, ev4],
  [-ev4, ev3],
].map(pair => Fp2.fromBigTuple(pair));
const FP6_FROBENIUS_COEFFICIENTS_1 = [
  [0x1n, 0x0n],
  [
    0x0n,
    0x1a0111ea397fe699ec02408663d4de85aa0d857d89759ad4897d29650fb85f9b409427eb4f49fffd8bfd00000000aaacn,
  ],
  [
    0x00000000000000005f19672fdf76ce51ba69c6076a0f77eaddb3a93be6f89688de17d813620a00022e01fffffffefffen,
    0x0n,
  ],
  [0x0n, 0x1n],
  [
    0x1a0111ea397fe699ec02408663d4de85aa0d857d89759ad4897d29650fb85f9b409427eb4f49fffd8bfd00000000aaacn,
    0x0n,
  ],
  [
    0x0n,
    0x00000000000000005f19672fdf76ce51ba69c6076a0f77eaddb3a93be6f89688de17d813620a00022e01fffffffefffen,
  ],
].map(pair => Fp2.fromBigTuple(pair));
const FP6_FROBENIUS_COEFFICIENTS_2 = [
  [0x1n, 0x0n],
  [
    0x1a0111ea397fe699ec02408663d4de85aa0d857d89759ad4897d29650fb85f9b409427eb4f49fffd8bfd00000000aaadn,
    0x0n,
  ],
  [
    0x1a0111ea397fe699ec02408663d4de85aa0d857d89759ad4897d29650fb85f9b409427eb4f49fffd8bfd00000000aaacn,
    0x0n,
  ],
  [
    0x1a0111ea397fe69a4b1ba7b6434bacd764774b84f38512bf6730d2a0f6b0f6241eabfffeb153ffffb9feffffffffaaaan,
    0x0n,
  ],
  [
    0x00000000000000005f19672fdf76ce51ba69c6076a0f77eaddb3a93be6f89688de17d813620a00022e01fffffffefffen,
    0x0n,
  ],
  [
    0x00000000000000005f19672fdf76ce51ba69c6076a0f77eaddb3a93be6f89688de17d813620a00022e01fffffffeffffn,
    0x0n,
  ],
].map(pair => Fp2.fromBigTuple(pair));
const FP12_FROBENIUS_COEFFICIENTS = [
  [0x1n, 0x0n],
  [
    0x1904d3bf02bb0667c231beb4202c0d1f0fd603fd3cbd5f4f7b2443d784bab9c4f67ea53d63e7813d8d0775ed92235fb8n,
    0x00fc3e2b36c4e03288e9e902231f9fb854a14787b6c7b36fec0c8ec971f63c5f282d5ac14d6c7ec22cf78a126ddc4af3n,
  ],
  [
    0x00000000000000005f19672fdf76ce51ba69c6076a0f77eaddb3a93be6f89688de17d813620a00022e01fffffffeffffn,
    0x0n,
  ],
  [
    0x135203e60180a68ee2e9c448d77a2cd91c3dedd930b1cf60ef396489f61eb45e304466cf3e67fa0af1ee7b04121bdea2n,
    0x06af0e0437ff400b6831e36d6bd17ffe48395dabc2d3435e77f76e17009241c5ee67992f72ec05f4c81084fbede3cc09n,
  ],
  [
    0x00000000000000005f19672fdf76ce51ba69c6076a0f77eaddb3a93be6f89688de17d813620a00022e01fffffffefffen,
    0x0n,
  ],
  [
    0x144e4211384586c16bd3ad4afa99cc9170df3560e77982d0db45f3536814f0bd5871c1908bd478cd1ee605167ff82995n,
    0x05b2cfd9013a5fd8df47fa6b48b1e045f39816240c0b8fee8beadf4d8e9c0566c63a3e6e257f87329b18fae980078116n,
  ],
  [
    0x1a0111ea397fe69a4b1ba7b6434bacd764774b84f38512bf6730d2a0f6b0f6241eabfffeb153ffffb9feffffffffaaaan,
    0x0n,
  ],
  [
    0x00fc3e2b36c4e03288e9e902231f9fb854a14787b6c7b36fec0c8ec971f63c5f282d5ac14d6c7ec22cf78a126ddc4af3n,
    0x1904d3bf02bb0667c231beb4202c0d1f0fd603fd3cbd5f4f7b2443d784bab9c4f67ea53d63e7813d8d0775ed92235fb8n,
  ],
  [
    0x1a0111ea397fe699ec02408663d4de85aa0d857d89759ad4897d29650fb85f9b409427eb4f49fffd8bfd00000000aaacn,
    0x0n,
  ],
  [
    0x06af0e0437ff400b6831e36d6bd17ffe48395dabc2d3435e77f76e17009241c5ee67992f72ec05f4c81084fbede3cc09n,
    0x135203e60180a68ee2e9c448d77a2cd91c3dedd930b1cf60ef396489f61eb45e304466cf3e67fa0af1ee7b04121bdea2n,
  ],
  [
    0x1a0111ea397fe699ec02408663d4de85aa0d857d89759ad4897d29650fb85f9b409427eb4f49fffd8bfd00000000aaadn,
    0x0n,
  ],
  [
    0x05b2cfd9013a5fd8df47fa6b48b1e045f39816240c0b8fee8beadf4d8e9c0566c63a3e6e257f87329b18fae980078116n,
    0x144e4211384586c16bd3ad4afa99cc9170df3560e77982d0db45f3536814f0bd5871c1908bd478cd1ee605167ff82995n,
  ],
].map(n => Fp2.fromBigTuple(n));
const xnum = [
  [
    0x5c759507e8e333ebb5b7a9a47d7ed8532c52d39fd3a042a88b58423c50ae15d5c2638e343d9c71c6238aaaaaaaa97d6n,
    0x5c759507e8e333ebb5b7a9a47d7ed8532c52d39fd3a042a88b58423c50ae15d5c2638e343d9c71c6238aaaaaaaa97d6n,
  ],
  [
    0x0n,
    0x11560bf17baa99bc32126fced787c88f984f87adf7ae0c7f9a208c6b4f20a4181472aaa9cb8d555526a9ffffffffc71an,
  ],
  [
    0x11560bf17baa99bc32126fced787c88f984f87adf7ae0c7f9a208c6b4f20a4181472aaa9cb8d555526a9ffffffffc71en,
    0x8ab05f8bdd54cde190937e76bc3e447cc27c3d6fbd7063fcd104635a790520c0a395554e5c6aaaa9354ffffffffe38dn,
  ],
  [
    0x171d6541fa38ccfaed6dea691f5fb614cb14b4e7f4e810aa22d6108f142b85757098e38d0f671c7188e2aaaaaaaa5ed1n,
    0x0n,
  ],
].map(pair => Fp2.fromBigTuple(pair));
const xden = [
  [
    0x0n,
    0x1a0111ea397fe69a4b1ba7b6434bacd764774b84f38512bf6730d2a0f6b0f6241eabfffeb153ffffb9feffffffffaa63n,
  ],
  [
    0xcn,
    0x1a0111ea397fe69a4b1ba7b6434bacd764774b84f38512bf6730d2a0f6b0f6241eabfffeb153ffffb9feffffffffaa9fn,
  ],
  [0x1n, 0x0n],
  [0x0n, 0x0n],
].map(pair => Fp2.fromBigTuple(pair));
const ynum = [
  [
    0x1530477c7ab4113b59a4c18b076d11930f7da5d4a07f649bf54439d87d27e500fc8c25ebf8c92f6812cfc71c71c6d706n,
    0x1530477c7ab4113b59a4c18b076d11930f7da5d4a07f649bf54439d87d27e500fc8c25ebf8c92f6812cfc71c71c6d706n,
  ],
  [
    0x0n,
    0x5c759507e8e333ebb5b7a9a47d7ed8532c52d39fd3a042a88b58423c50ae15d5c2638e343d9c71c6238aaaaaaaa97ben,
  ],
  [
    0x11560bf17baa99bc32126fced787c88f984f87adf7ae0c7f9a208c6b4f20a4181472aaa9cb8d555526a9ffffffffc71cn,
    0x8ab05f8bdd54cde190937e76bc3e447cc27c3d6fbd7063fcd104635a790520c0a395554e5c6aaaa9354ffffffffe38fn,
  ],
  [
    0x124c9ad43b6cf79bfbf7043de3811ad0761b0f37a1e26286b0e977c69aa274524e79097a56dc4bd9e1b371c71c718b10n,
    0x0n,
  ],
].map(pair => Fp2.fromBigTuple(pair));
const yden = [
  [
    0x1a0111ea397fe69a4b1ba7b6434bacd764774b84f38512bf6730d2a0f6b0f6241eabfffeb153ffffb9feffffffffa8fbn,
    0x1a0111ea397fe69a4b1ba7b6434bacd764774b84f38512bf6730d2a0f6b0f6241eabfffeb153ffffb9feffffffffa8fbn,
  ],
  [
    0x0n,
    0x1a0111ea397fe69a4b1ba7b6434bacd764774b84f38512bf6730d2a0f6b0f6241eabfffeb153ffffb9feffffffffa9d3n,
  ],
  [
    0x12n,
    0x1a0111ea397fe69a4b1ba7b6434bacd764774b84f38512bf6730d2a0f6b0f6241eabfffeb153ffffb9feffffffffaa99n,
  ],
  [0x1n, 0x0n],
].map(pair => Fp2.fromBigTuple(pair));
const ISOGENY_COEFFICIENTS = [xnum, xden, ynum, yden];
