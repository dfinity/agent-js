'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.Variant =
  exports.Record =
  exports.Opt =
  exports.Vec =
  exports.Tuple =
  exports.Principal =
  exports.Nat64 =
  exports.Nat32 =
  exports.Nat16 =
  exports.Nat8 =
  exports.Int64 =
  exports.Int32 =
  exports.Int16 =
  exports.Int8 =
  exports.Float64 =
  exports.Float32 =
  exports.Nat =
  exports.Int =
  exports.Text =
  exports.Null =
  exports.Bool =
  exports.Unknown =
  exports.Reserved =
  exports.Empty =
  exports.decode =
  exports.encode =
  exports.ServiceClass =
  exports.FuncClass =
  exports.PrincipalClass =
  exports.RecClass =
  exports.VariantClass =
  exports.TupleClass =
  exports.RecordClass =
  exports.OptClass =
  exports.VecClass =
  exports.FixedNatClass =
  exports.FixedIntClass =
  exports.FloatClass =
  exports.NatClass =
  exports.IntClass =
  exports.TextClass =
  exports.ReservedClass =
  exports.NullClass =
  exports.BoolClass =
  exports.UnknownClass =
  exports.EmptyClass =
  exports.ConstructType =
  exports.PrimitiveType =
  exports.Type =
  exports.Visitor =
    void 0;
exports.Service = exports.Func = exports.Rec = void 0;
// tslint:disable:max-classes-per-file
const principal_1 = require('@dfinity/principal');
const buffer_js_1 = require('./utils/buffer.js');
const hash_js_1 = require('./utils/hash.js');
const leb128_js_1 = require('./utils/leb128.js');
const bigint_math_js_1 = require('./utils/bigint-math.js');
const magicNumber = 'DIDL';
const toReadableString_max = 400; // will not display arguments after 400chars. Makes sure 2mb blobs don't get inside the error
function zipWith(xs, ys, f) {
  return xs.map((x, i) => f(x, ys[i]));
}
/**
 * An IDL Type Table, which precedes the data in the stream.
 */
class TypeTable {
  constructor() {
    // List of types. Needs to be an array as the index needs to be stable.
    this._typs = [];
    this._idx = new Map();
  }
  has(obj) {
    return this._idx.has(obj.name);
  }
  add(type, buf) {
    const idx = this._typs.length;
    this._idx.set(type.name, idx);
    this._typs.push(buf);
  }
  merge(obj, knot) {
    const idx = this._idx.get(obj.name);
    const knotIdx = this._idx.get(knot);
    if (idx === undefined) {
      throw new Error('Missing type index for ' + obj);
    }
    if (knotIdx === undefined) {
      throw new Error('Missing type index for ' + knot);
    }
    this._typs[idx] = this._typs[knotIdx];
    // Delete the type.
    this._typs.splice(knotIdx, 1);
    this._idx.delete(knot);
  }
  encode() {
    const len = (0, leb128_js_1.lebEncode)(this._typs.length);
    const buf = (0, buffer_js_1.concat)(...this._typs);
    return (0, buffer_js_1.concat)(len, buf);
  }
  indexOf(typeName) {
    if (!this._idx.has(typeName)) {
      throw new Error('Missing type index for ' + typeName);
    }
    return (0, leb128_js_1.slebEncode)(this._idx.get(typeName) || 0);
  }
}
class Visitor {
  visitType(t, data) {
    throw new Error('Not implemented');
  }
  visitPrimitive(t, data) {
    return this.visitType(t, data);
  }
  visitEmpty(t, data) {
    return this.visitPrimitive(t, data);
  }
  visitBool(t, data) {
    return this.visitPrimitive(t, data);
  }
  visitNull(t, data) {
    return this.visitPrimitive(t, data);
  }
  visitReserved(t, data) {
    return this.visitPrimitive(t, data);
  }
  visitText(t, data) {
    return this.visitPrimitive(t, data);
  }
  visitNumber(t, data) {
    return this.visitPrimitive(t, data);
  }
  visitInt(t, data) {
    return this.visitNumber(t, data);
  }
  visitNat(t, data) {
    return this.visitNumber(t, data);
  }
  visitFloat(t, data) {
    return this.visitPrimitive(t, data);
  }
  visitFixedInt(t, data) {
    return this.visitNumber(t, data);
  }
  visitFixedNat(t, data) {
    return this.visitNumber(t, data);
  }
  visitPrincipal(t, data) {
    return this.visitPrimitive(t, data);
  }
  visitConstruct(t, data) {
    return this.visitType(t, data);
  }
  visitVec(t, ty, data) {
    return this.visitConstruct(t, data);
  }
  visitOpt(t, ty, data) {
    return this.visitConstruct(t, data);
  }
  visitRecord(t, fields, data) {
    return this.visitConstruct(t, data);
  }
  visitTuple(t, components, data) {
    const fields = components.map((ty, i) => [`_${i}_`, ty]);
    return this.visitRecord(t, fields, data);
  }
  visitVariant(t, fields, data) {
    return this.visitConstruct(t, data);
  }
  visitRec(t, ty, data) {
    return this.visitConstruct(ty, data);
  }
  visitFunc(t, data) {
    return this.visitConstruct(t, data);
  }
  visitService(t, data) {
    return this.visitConstruct(t, data);
  }
}
exports.Visitor = Visitor;
/**
 * Represents an IDL type.
 */
class Type {
  /* Display type name */
  display() {
    return this.name;
  }
  valueToString(x) {
    return toReadableString(x);
  }
  /* Implement `T` in the IDL spec, only needed for non-primitive types */
  buildTypeTable(typeTable) {
    if (!typeTable.has(this)) {
      this._buildTypeTableImpl(typeTable);
    }
  }
}
exports.Type = Type;
class PrimitiveType extends Type {
  checkType(t) {
    if (this.name !== t.name) {
      throw new Error(`type mismatch: type on the wire ${t.name}, expect type ${this.name}`);
    }
    return t;
  }
  _buildTypeTableImpl(typeTable) {
    // No type table encoding for Primitive types.
    return;
  }
}
exports.PrimitiveType = PrimitiveType;
class ConstructType extends Type {
  checkType(t) {
    if (t instanceof RecClass) {
      const ty = t.getType();
      if (typeof ty === 'undefined') {
        throw new Error('type mismatch with uninitialized type');
      }
      return ty;
    }
    throw new Error(`type mismatch: type on the wire ${t.name}, expect type ${this.name}`);
  }
  encodeType(typeTable) {
    return typeTable.indexOf(this.name);
  }
}
exports.ConstructType = ConstructType;
/**
 * Represents an IDL Empty, a type which has no inhabitants.
 * Since no values exist for this type, it cannot be serialised or deserialised.
 * Result types like `Result<Text, Empty>` should always succeed.
 */
class EmptyClass extends PrimitiveType {
  accept(v, d) {
    return v.visitEmpty(this, d);
  }
  covariant(x) {
    throw new Error(`Invalid ${this.display()} argument: ${toReadableString(x)}`);
  }
  encodeValue() {
    throw new Error('Empty cannot appear as a function argument');
  }
  valueToString() {
    throw new Error('Empty cannot appear as a value');
  }
  encodeType() {
    return (0, leb128_js_1.slebEncode)(-17 /* IDLTypeIds.Empty */);
  }
  decodeValue() {
    throw new Error('Empty cannot appear as an output');
  }
  get name() {
    return 'empty';
  }
}
exports.EmptyClass = EmptyClass;
/**
 * Represents an IDL Unknown, a placeholder type for deserialization only.
 * When decoding a value as Unknown, all fields will be retained but the names are only available in
 * hashed form.
 * A deserialized unknown will offer it's actual type by calling the `type()` function.
 * Unknown cannot be serialized and attempting to do so will throw an error.
 */
class UnknownClass extends Type {
  checkType(t) {
    throw new Error('Method not implemented for unknown.');
  }
  accept(v, d) {
    throw v.visitType(this, d);
  }
  covariant(x) {
    throw new Error(`Invalid ${this.display()} argument: ${toReadableString(x)}`);
  }
  encodeValue() {
    throw new Error('Unknown cannot appear as a function argument');
  }
  valueToString() {
    throw new Error('Unknown cannot appear as a value');
  }
  encodeType() {
    throw new Error('Unknown cannot be serialized');
  }
  decodeValue(b, t) {
    let decodedValue = t.decodeValue(b, t);
    if (Object(decodedValue) !== decodedValue) {
      // decodedValue is primitive. Box it, otherwise we cannot add the type() function.
      // The type() function is important for primitives because otherwise we cannot tell apart the
      // different number types.
      decodedValue = Object(decodedValue);
    }
    let typeFunc;
    if (t instanceof RecClass) {
      typeFunc = () => t.getType();
    } else {
      typeFunc = () => t;
    }
    // Do not use 'decodedValue.type = typeFunc' because this would lead to an enumerable property
    // 'type' which means it would be serialized if the value would be candid encoded again.
    // This in turn leads to problems if the decoded value is a variant because these values are
    // only allowed to have a single property.
    Object.defineProperty(decodedValue, 'type', {
      value: typeFunc,
      writable: true,
      enumerable: false,
      configurable: true,
    });
    return decodedValue;
  }
  _buildTypeTableImpl() {
    throw new Error('Unknown cannot be serialized');
  }
  get name() {
    return 'Unknown';
  }
}
exports.UnknownClass = UnknownClass;
/**
 * Represents an IDL Bool
 */
class BoolClass extends PrimitiveType {
  accept(v, d) {
    return v.visitBool(this, d);
  }
  covariant(x) {
    if (typeof x === 'boolean') return true;
    throw new Error(`Invalid ${this.display()} argument: ${toReadableString(x)}`);
  }
  encodeValue(x) {
    return new Uint8Array([x ? 1 : 0]);
  }
  encodeType() {
    return (0, leb128_js_1.slebEncode)(-2 /* IDLTypeIds.Bool */);
  }
  decodeValue(b, t) {
    this.checkType(t);
    switch ((0, leb128_js_1.safeReadUint8)(b)) {
      case 0:
        return false;
      case 1:
        return true;
      default:
        throw new Error('Boolean value out of range');
    }
  }
  get name() {
    return 'bool';
  }
}
exports.BoolClass = BoolClass;
/**
 * Represents an IDL Null
 */
class NullClass extends PrimitiveType {
  accept(v, d) {
    return v.visitNull(this, d);
  }
  covariant(x) {
    if (x === null) return true;
    throw new Error(`Invalid ${this.display()} argument: ${toReadableString(x)}`);
  }
  encodeValue() {
    return new ArrayBuffer(0);
  }
  encodeType() {
    return (0, leb128_js_1.slebEncode)(-1 /* IDLTypeIds.Null */);
  }
  decodeValue(b, t) {
    this.checkType(t);
    return null;
  }
  get name() {
    return 'null';
  }
}
exports.NullClass = NullClass;
/**
 * Represents an IDL Reserved
 */
class ReservedClass extends PrimitiveType {
  accept(v, d) {
    return v.visitReserved(this, d);
  }
  covariant(x) {
    return true;
  }
  encodeValue() {
    return new ArrayBuffer(0);
  }
  encodeType() {
    return (0, leb128_js_1.slebEncode)(-16 /* IDLTypeIds.Reserved */);
  }
  decodeValue(b, t) {
    if (t.name !== this.name) {
      t.decodeValue(b, t);
    }
    return null;
  }
  get name() {
    return 'reserved';
  }
}
exports.ReservedClass = ReservedClass;
/**
 * Represents an IDL Text
 */
class TextClass extends PrimitiveType {
  accept(v, d) {
    return v.visitText(this, d);
  }
  covariant(x) {
    if (typeof x === 'string') return true;
    throw new Error(`Invalid ${this.display()} argument: ${toReadableString(x)}`);
  }
  encodeValue(x) {
    const buf = new TextEncoder().encode(x);
    const len = (0, leb128_js_1.lebEncode)(buf.byteLength);
    return (0, buffer_js_1.concat)(len, buf);
  }
  encodeType() {
    return (0, leb128_js_1.slebEncode)(-15 /* IDLTypeIds.Text */);
  }
  decodeValue(b, t) {
    this.checkType(t);
    const len = (0, leb128_js_1.lebDecode)(b);
    const buf = (0, leb128_js_1.safeRead)(b, Number(len));
    const decoder = new TextDecoder('utf8', { fatal: true });
    return decoder.decode(buf);
  }
  get name() {
    return 'text';
  }
  valueToString(x) {
    return '"' + x + '"';
  }
}
exports.TextClass = TextClass;
/**
 * Represents an IDL Int
 */
class IntClass extends PrimitiveType {
  accept(v, d) {
    return v.visitInt(this, d);
  }
  covariant(x) {
    // We allow encoding of JavaScript plain numbers.
    // But we will always decode to bigint.
    if (typeof x === 'bigint' || Number.isInteger(x)) return true;
    throw new Error(`Invalid ${this.display()} argument: ${toReadableString(x)}`);
  }
  encodeValue(x) {
    return (0, leb128_js_1.slebEncode)(x);
  }
  encodeType() {
    return (0, leb128_js_1.slebEncode)(-4 /* IDLTypeIds.Int */);
  }
  decodeValue(b, t) {
    this.checkType(t);
    return (0, leb128_js_1.slebDecode)(b);
  }
  get name() {
    return 'int';
  }
  valueToString(x) {
    return x.toString();
  }
}
exports.IntClass = IntClass;
/**
 * Represents an IDL Nat
 */
class NatClass extends PrimitiveType {
  accept(v, d) {
    return v.visitNat(this, d);
  }
  covariant(x) {
    // We allow encoding of JavaScript plain numbers.
    // But we will always decode to bigint.
    if ((typeof x === 'bigint' && x >= BigInt(0)) || (Number.isInteger(x) && x >= 0)) return true;
    throw new Error(`Invalid ${this.display()} argument: ${toReadableString(x)}`);
  }
  encodeValue(x) {
    return (0, leb128_js_1.lebEncode)(x);
  }
  encodeType() {
    return (0, leb128_js_1.slebEncode)(-3 /* IDLTypeIds.Nat */);
  }
  decodeValue(b, t) {
    this.checkType(t);
    return (0, leb128_js_1.lebDecode)(b);
  }
  get name() {
    return 'nat';
  }
  valueToString(x) {
    return x.toString();
  }
}
exports.NatClass = NatClass;
/**
 * Represents an IDL Float
 */
class FloatClass extends PrimitiveType {
  constructor(_bits) {
    super();
    this._bits = _bits;
    if (_bits !== 32 && _bits !== 64) {
      throw new Error('not a valid float type');
    }
  }
  accept(v, d) {
    return v.visitFloat(this, d);
  }
  covariant(x) {
    if (typeof x === 'number' || x instanceof Number) return true;
    throw new Error(`Invalid ${this.display()} argument: ${toReadableString(x)}`);
  }
  encodeValue(x) {
    const buf = new ArrayBuffer(this._bits / 8);
    const view = new DataView(buf);
    if (this._bits === 32) {
      view.setFloat32(0, x, true);
    } else {
      view.setFloat64(0, x, true);
    }
    return buf;
  }
  encodeType() {
    const opcode = this._bits === 32 ? -13 /* IDLTypeIds.Float32 */ : -14; /* IDLTypeIds.Float64 */
    return (0, leb128_js_1.slebEncode)(opcode);
  }
  decodeValue(b, t) {
    this.checkType(t);
    const bytes = (0, leb128_js_1.safeRead)(b, this._bits / 8);
    const view = new DataView(bytes);
    if (this._bits === 32) {
      return view.getFloat32(0, true);
    } else {
      return view.getFloat64(0, true);
    }
  }
  get name() {
    return 'float' + this._bits;
  }
  valueToString(x) {
    return x.toString();
  }
}
exports.FloatClass = FloatClass;
/**
 * Represents an IDL fixed-width Int(n)
 */
class FixedIntClass extends PrimitiveType {
  constructor(_bits) {
    super();
    this._bits = _bits;
  }
  accept(v, d) {
    return v.visitFixedInt(this, d);
  }
  covariant(x) {
    const min = (0, bigint_math_js_1.iexp2)(this._bits - 1) * BigInt(-1);
    const max = (0, bigint_math_js_1.iexp2)(this._bits - 1) - BigInt(1);
    let ok = false;
    if (typeof x === 'bigint') {
      ok = x >= min && x <= max;
    } else if (Number.isInteger(x)) {
      const v = BigInt(x);
      ok = v >= min && v <= max;
    } else {
      ok = false;
    }
    if (ok) return true;
    throw new Error(`Invalid ${this.display()} argument: ${toReadableString(x)}`);
  }
  encodeValue(x) {
    return (0, leb128_js_1.writeIntLE)(x, this._bits / 8);
  }
  encodeType() {
    const offset = Math.log2(this._bits) - 3;
    return (0, leb128_js_1.slebEncode)(-9 - offset);
  }
  decodeValue(b, t) {
    this.checkType(t);
    const num = (0, leb128_js_1.readIntLE)(b, this._bits / 8);
    if (this._bits <= 32) {
      return Number(num);
    } else {
      return num;
    }
  }
  get name() {
    return `int${this._bits}`;
  }
  valueToString(x) {
    return x.toString();
  }
}
exports.FixedIntClass = FixedIntClass;
/**
 * Represents an IDL fixed-width Nat(n)
 */
class FixedNatClass extends PrimitiveType {
  constructor(_bits) {
    super();
    this._bits = _bits;
  }
  accept(v, d) {
    return v.visitFixedNat(this, d);
  }
  covariant(x) {
    const max = (0, bigint_math_js_1.iexp2)(this._bits);
    let ok = false;
    if (typeof x === 'bigint' && x >= BigInt(0)) {
      ok = x < max;
    } else if (Number.isInteger(x) && x >= 0) {
      const v = BigInt(x);
      ok = v < max;
    } else {
      ok = false;
    }
    if (ok) return true;
    throw new Error(`Invalid ${this.display()} argument: ${toReadableString(x)}`);
  }
  encodeValue(x) {
    return (0, leb128_js_1.writeUIntLE)(x, this._bits / 8);
  }
  encodeType() {
    const offset = Math.log2(this._bits) - 3;
    return (0, leb128_js_1.slebEncode)(-5 - offset);
  }
  decodeValue(b, t) {
    this.checkType(t);
    const num = (0, leb128_js_1.readUIntLE)(b, this._bits / 8);
    if (this._bits <= 32) {
      return Number(num);
    } else {
      return num;
    }
  }
  get name() {
    return `nat${this._bits}`;
  }
  valueToString(x) {
    return x.toString();
  }
}
exports.FixedNatClass = FixedNatClass;
/**
 * Represents an IDL Array
 *
 * Arrays of fixed-sized nat/int type (e.g. nat8), are encoded from and decoded to TypedArrays (e.g. Uint8Array).
 * Arrays of float or other non-primitive types are encoded/decoded as untyped array in Javascript.
 *
 * @param {Type} t
 */
class VecClass extends ConstructType {
  constructor(_type) {
    super();
    this._type = _type;
    // If true, this vector is really a blob and we can just use memcpy.
    //
    // NOTE:
    // With support of encoding/dencoding of TypedArrays, this optimization is
    // only used when plain array of bytes are passed as encoding input in order
    // to be backward compatible.
    this._blobOptimization = false;
    if (_type instanceof FixedNatClass && _type._bits === 8) {
      this._blobOptimization = true;
    }
  }
  accept(v, d) {
    return v.visitVec(this, this._type, d);
  }
  covariant(x) {
    // Special case for ArrayBuffer
    const bits =
      this._type instanceof FixedNatClass
        ? this._type._bits
        : this._type instanceof FixedIntClass
        ? this._type._bits
        : 0;
    if (
      (ArrayBuffer.isView(x) && bits == x.BYTES_PER_ELEMENT * 8) ||
      (Array.isArray(x) &&
        x.every((v, idx) => {
          try {
            return this._type.covariant(v);
          } catch (e) {
            throw new Error(`Invalid ${this.display()} argument: \n\nindex ${idx} -> ${e.message}`);
          }
        }))
    )
      return true;
    throw new Error(`Invalid ${this.display()} argument: ${toReadableString(x)}`);
  }
  encodeValue(x) {
    const len = (0, leb128_js_1.lebEncode)(x.length);
    if (this._blobOptimization) {
      return (0, buffer_js_1.concat)(len, new Uint8Array(x));
    }
    if (ArrayBuffer.isView(x)) {
      return (0, buffer_js_1.concat)(len, new Uint8Array(x.buffer));
    }
    const buf = new buffer_js_1.PipeArrayBuffer(new ArrayBuffer(len.byteLength + x.length), 0);
    buf.write(len);
    for (const d of x) {
      const encoded = this._type.encodeValue(d);
      buf.write(new Uint8Array(encoded));
    }
    return buf.buffer;
  }
  _buildTypeTableImpl(typeTable) {
    this._type.buildTypeTable(typeTable);
    const opCode = (0, leb128_js_1.slebEncode)(-19 /* IDLTypeIds.Vector */);
    const buffer = this._type.encodeType(typeTable);
    typeTable.add(this, (0, buffer_js_1.concat)(opCode, buffer));
  }
  decodeValue(b, t) {
    const vec = this.checkType(t);
    if (!(vec instanceof VecClass)) {
      throw new Error('Not a vector type');
    }
    const len = Number((0, leb128_js_1.lebDecode)(b));
    if (this._type instanceof FixedNatClass) {
      if (this._type._bits == 8) {
        return new Uint8Array(b.read(len));
      }
      if (this._type._bits == 16) {
        return new Uint16Array(b.read(len * 2));
      }
      if (this._type._bits == 32) {
        return new Uint32Array(b.read(len * 4));
      }
      if (this._type._bits == 64) {
        return new BigUint64Array(b.read(len * 8));
      }
    }
    if (this._type instanceof FixedIntClass) {
      if (this._type._bits == 8) {
        return new Int8Array(b.read(len));
      }
      if (this._type._bits == 16) {
        return new Int16Array(b.read(len * 2));
      }
      if (this._type._bits == 32) {
        return new Int32Array(b.read(len * 4));
      }
      if (this._type._bits == 64) {
        return new BigInt64Array(b.read(len * 8));
      }
    }
    const rets = [];
    for (let i = 0; i < len; i++) {
      rets.push(this._type.decodeValue(b, vec._type));
    }
    return rets;
  }
  get name() {
    return `vec ${this._type.name}`;
  }
  display() {
    return `vec ${this._type.display()}`;
  }
  valueToString(x) {
    const elements = x.map(e => this._type.valueToString(e));
    return 'vec {' + elements.join('; ') + '}';
  }
}
exports.VecClass = VecClass;
/**
 * Represents an IDL Option
 * @param {Type} t
 */
class OptClass extends ConstructType {
  constructor(_type) {
    super();
    this._type = _type;
  }
  accept(v, d) {
    return v.visitOpt(this, this._type, d);
  }
  covariant(x) {
    try {
      if (Array.isArray(x) && (x.length === 0 || (x.length === 1 && this._type.covariant(x[0]))))
        return true;
    } catch (e) {
      throw new Error(
        `Invalid ${this.display()} argument: ${toReadableString(x)} \n\n-> ${e.message}`,
      );
    }
    throw new Error(`Invalid ${this.display()} argument: ${toReadableString(x)}`);
  }
  encodeValue(x) {
    if (x.length === 0) {
      return new Uint8Array([0]);
    } else {
      return (0, buffer_js_1.concat)(new Uint8Array([1]), this._type.encodeValue(x[0]));
    }
  }
  _buildTypeTableImpl(typeTable) {
    this._type.buildTypeTable(typeTable);
    const opCode = (0, leb128_js_1.slebEncode)(-18 /* IDLTypeIds.Opt */);
    const buffer = this._type.encodeType(typeTable);
    typeTable.add(this, (0, buffer_js_1.concat)(opCode, buffer));
  }
  decodeValue(b, t) {
    const opt = this.checkType(t);
    if (!(opt instanceof OptClass)) {
      throw new Error('Not an option type');
    }
    switch ((0, leb128_js_1.safeReadUint8)(b)) {
      case 0:
        return [];
      case 1:
        return [this._type.decodeValue(b, opt._type)];
      default:
        throw new Error('Not an option value');
    }
  }
  get name() {
    return `opt ${this._type.name}`;
  }
  display() {
    return `opt ${this._type.display()}`;
  }
  valueToString(x) {
    if (x.length === 0) {
      return 'null';
    } else {
      return `opt ${this._type.valueToString(x[0])}`;
    }
  }
}
exports.OptClass = OptClass;
/**
 * Represents an IDL Record
 * @param {Object} [fields] - mapping of function name to Type
 */
class RecordClass extends ConstructType {
  constructor(fields = {}) {
    super();
    this._fields = Object.entries(fields).sort(
      (a, b) => (0, hash_js_1.idlLabelToId)(a[0]) - (0, hash_js_1.idlLabelToId)(b[0]),
    );
  }
  accept(v, d) {
    return v.visitRecord(this, this._fields, d);
  }
  tryAsTuple() {
    const res = [];
    for (let i = 0; i < this._fields.length; i++) {
      const [key, type] = this._fields[i];
      if (key !== `_${i}_`) {
        return null;
      }
      res.push(type);
    }
    return res;
  }
  covariant(x) {
    if (
      typeof x === 'object' &&
      this._fields.every(([k, t]) => {
        // eslint-disable-next-line
        if (!x.hasOwnProperty(k)) {
          throw new Error(`Record is missing key "${k}".`);
        }
        try {
          return t.covariant(x[k]);
        } catch (e) {
          throw new Error(`Invalid ${this.display()} argument: \n\nfield ${k} -> ${e.message}`);
        }
      })
    )
      return true;
    throw new Error(`Invalid ${this.display()} argument: ${toReadableString(x)}`);
  }
  encodeValue(x) {
    const values = this._fields.map(([key]) => x[key]);
    const bufs = zipWith(this._fields, values, ([, c], d) => c.encodeValue(d));
    return (0, buffer_js_1.concat)(...bufs);
  }
  _buildTypeTableImpl(T) {
    this._fields.forEach(([_, value]) => value.buildTypeTable(T));
    const opCode = (0, leb128_js_1.slebEncode)(-20 /* IDLTypeIds.Record */);
    const len = (0, leb128_js_1.lebEncode)(this._fields.length);
    const fields = this._fields.map(([key, value]) =>
      (0, buffer_js_1.concat)(
        (0, leb128_js_1.lebEncode)((0, hash_js_1.idlLabelToId)(key)),
        value.encodeType(T),
      ),
    );
    T.add(this, (0, buffer_js_1.concat)(opCode, len, (0, buffer_js_1.concat)(...fields)));
  }
  decodeValue(b, t) {
    const record = this.checkType(t);
    if (!(record instanceof RecordClass)) {
      throw new Error('Not a record type');
    }
    const x = {};
    let expectedRecordIdx = 0;
    let actualRecordIdx = 0;
    while (actualRecordIdx < record._fields.length) {
      const [hash, type] = record._fields[actualRecordIdx];
      if (expectedRecordIdx >= this._fields.length) {
        // skip unexpected left over fields present on the wire
        type.decodeValue(b, type);
        actualRecordIdx++;
        continue;
      }
      const [expectKey, expectType] = this._fields[expectedRecordIdx];
      const expectedId = (0, hash_js_1.idlLabelToId)(this._fields[expectedRecordIdx][0]);
      const actualId = (0, hash_js_1.idlLabelToId)(hash);
      if (expectedId === actualId) {
        // the current field on the wire matches the expected field
        x[expectKey] = expectType.decodeValue(b, type);
        expectedRecordIdx++;
        actualRecordIdx++;
      } else if (actualId > expectedId) {
        // The expected field does not exist on the wire
        if (expectType instanceof OptClass || expectType instanceof ReservedClass) {
          x[expectKey] = [];
          expectedRecordIdx++;
        } else {
          throw new Error('Cannot find required field ' + expectKey);
        }
      } else {
        // The field on the wire does not exist in the output type, so we can skip it
        type.decodeValue(b, type);
        actualRecordIdx++;
      }
    }
    // initialize left over expected optional fields
    for (const [expectKey, expectType] of this._fields.slice(expectedRecordIdx)) {
      if (expectType instanceof OptClass || expectType instanceof ReservedClass) {
        // TODO this assumes null value in opt is represented as []
        x[expectKey] = [];
      } else {
        throw new Error('Cannot find required field ' + expectKey);
      }
    }
    return x;
  }
  get name() {
    const fields = this._fields.map(([key, value]) => key + ':' + value.name);
    return `record {${fields.join('; ')}}`;
  }
  display() {
    const fields = this._fields.map(([key, value]) => key + ':' + value.display());
    return `record {${fields.join('; ')}}`;
  }
  valueToString(x) {
    const values = this._fields.map(([key]) => x[key]);
    const fields = zipWith(this._fields, values, ([k, c], d) => k + '=' + c.valueToString(d));
    return `record {${fields.join('; ')}}`;
  }
}
exports.RecordClass = RecordClass;
/**
 * Represents Tuple, a syntactic sugar for Record.
 * @param {Type} components
 */
class TupleClass extends RecordClass {
  constructor(_components) {
    const x = {};
    _components.forEach((e, i) => (x['_' + i + '_'] = e));
    super(x);
    this._components = _components;
  }
  accept(v, d) {
    return v.visitTuple(this, this._components, d);
  }
  covariant(x) {
    // `>=` because tuples can be covariant when encoded.
    if (
      Array.isArray(x) &&
      x.length >= this._fields.length &&
      this._components.every((t, i) => {
        try {
          return t.covariant(x[i]);
        } catch (e) {
          throw new Error(`Invalid ${this.display()} argument: \n\nindex ${i} -> ${e.message}`);
        }
      })
    )
      return true;
    throw new Error(`Invalid ${this.display()} argument: ${toReadableString(x)}`);
  }
  encodeValue(x) {
    const bufs = zipWith(this._components, x, (c, d) => c.encodeValue(d));
    return (0, buffer_js_1.concat)(...bufs);
  }
  decodeValue(b, t) {
    const tuple = this.checkType(t);
    if (!(tuple instanceof TupleClass)) {
      throw new Error('not a tuple type');
    }
    if (tuple._components.length < this._components.length) {
      throw new Error('tuple mismatch');
    }
    const res = [];
    for (const [i, wireType] of tuple._components.entries()) {
      if (i >= this._components.length) {
        // skip value
        wireType.decodeValue(b, wireType);
      } else {
        res.push(this._components[i].decodeValue(b, wireType));
      }
    }
    return res;
  }
  display() {
    const fields = this._components.map(value => value.display());
    return `record {${fields.join('; ')}}`;
  }
  valueToString(values) {
    const fields = zipWith(this._components, values, (c, d) => c.valueToString(d));
    return `record {${fields.join('; ')}}`;
  }
}
exports.TupleClass = TupleClass;
/**
 * Represents an IDL Variant
 * @param {Object} [fields] - mapping of function name to Type
 */
class VariantClass extends ConstructType {
  constructor(fields = {}) {
    super();
    this._fields = Object.entries(fields).sort(
      (a, b) => (0, hash_js_1.idlLabelToId)(a[0]) - (0, hash_js_1.idlLabelToId)(b[0]),
    );
  }
  accept(v, d) {
    return v.visitVariant(this, this._fields, d);
  }
  covariant(x) {
    if (
      typeof x === 'object' &&
      Object.entries(x).length === 1 &&
      this._fields.every(([k, v]) => {
        try {
          // eslint-disable-next-line
          return !x.hasOwnProperty(k) || v.covariant(x[k]);
        } catch (e) {
          throw new Error(`Invalid ${this.display()} argument: \n\nvariant ${k} -> ${e.message}`);
        }
      })
    )
      return true;
    throw new Error(`Invalid ${this.display()} argument: ${toReadableString(x)}`);
  }
  encodeValue(x) {
    for (let i = 0; i < this._fields.length; i++) {
      const [name, type] = this._fields[i];
      // eslint-disable-next-line
      if (x.hasOwnProperty(name)) {
        const idx = (0, leb128_js_1.lebEncode)(i);
        const buf = type.encodeValue(x[name]);
        return (0, buffer_js_1.concat)(idx, buf);
      }
    }
    throw Error('Variant has no data: ' + x);
  }
  _buildTypeTableImpl(typeTable) {
    this._fields.forEach(([, type]) => {
      type.buildTypeTable(typeTable);
    });
    const opCode = (0, leb128_js_1.slebEncode)(-21 /* IDLTypeIds.Variant */);
    const len = (0, leb128_js_1.lebEncode)(this._fields.length);
    const fields = this._fields.map(([key, value]) =>
      (0, buffer_js_1.concat)(
        (0, leb128_js_1.lebEncode)((0, hash_js_1.idlLabelToId)(key)),
        value.encodeType(typeTable),
      ),
    );
    typeTable.add(this, (0, buffer_js_1.concat)(opCode, len, ...fields));
  }
  decodeValue(b, t) {
    const variant = this.checkType(t);
    if (!(variant instanceof VariantClass)) {
      throw new Error('Not a variant type');
    }
    const idx = Number((0, leb128_js_1.lebDecode)(b));
    if (idx >= variant._fields.length) {
      throw Error('Invalid variant index: ' + idx);
    }
    const [wireHash, wireType] = variant._fields[idx];
    for (const [key, expectType] of this._fields) {
      if ((0, hash_js_1.idlLabelToId)(wireHash) === (0, hash_js_1.idlLabelToId)(key)) {
        const value = expectType.decodeValue(b, wireType);
        return { [key]: value };
      }
    }
    throw new Error('Cannot find field hash ' + wireHash);
  }
  get name() {
    const fields = this._fields.map(([key, type]) => key + ':' + type.name);
    return `variant {${fields.join('; ')}}`;
  }
  display() {
    const fields = this._fields.map(
      ([key, type]) => key + (type.name === 'null' ? '' : `:${type.display()}`),
    );
    return `variant {${fields.join('; ')}}`;
  }
  valueToString(x) {
    for (const [name, type] of this._fields) {
      // eslint-disable-next-line
      if (x.hasOwnProperty(name)) {
        const value = type.valueToString(x[name]);
        if (value === 'null') {
          return `variant {${name}}`;
        } else {
          return `variant {${name}=${value}}`;
        }
      }
    }
    throw new Error('Variant has no data: ' + x);
  }
}
exports.VariantClass = VariantClass;
/**
 * Represents a reference to an IDL type, used for defining recursive data
 * types.
 */
class RecClass extends ConstructType {
  constructor() {
    super(...arguments);
    this._id = RecClass._counter++;
    this._type = undefined;
  }
  accept(v, d) {
    if (!this._type) {
      throw Error('Recursive type uninitialized.');
    }
    return v.visitRec(this, this._type, d);
  }
  fill(t) {
    this._type = t;
  }
  getType() {
    return this._type;
  }
  covariant(x) {
    if (this._type ? this._type.covariant(x) : false) return true;
    throw new Error(`Invalid ${this.display()} argument: ${toReadableString(x)}`);
  }
  encodeValue(x) {
    if (!this._type) {
      throw Error('Recursive type uninitialized.');
    }
    return this._type.encodeValue(x);
  }
  _buildTypeTableImpl(typeTable) {
    if (!this._type) {
      throw Error('Recursive type uninitialized.');
    }
    typeTable.add(this, new Uint8Array([]));
    this._type.buildTypeTable(typeTable);
    typeTable.merge(this, this._type.name);
  }
  decodeValue(b, t) {
    if (!this._type) {
      throw Error('Recursive type uninitialized.');
    }
    return this._type.decodeValue(b, t);
  }
  get name() {
    return `rec_${this._id}`;
  }
  display() {
    if (!this._type) {
      throw Error('Recursive type uninitialized.');
    }
    return `μ${this.name}.${this._type.name}`;
  }
  valueToString(x) {
    if (!this._type) {
      throw Error('Recursive type uninitialized.');
    }
    return this._type.valueToString(x);
  }
}
exports.RecClass = RecClass;
RecClass._counter = 0;
function decodePrincipalId(b) {
  const x = (0, leb128_js_1.safeReadUint8)(b);
  if (x !== 1) {
    throw new Error('Cannot decode principal');
  }
  const len = Number((0, leb128_js_1.lebDecode)(b));
  return principal_1.Principal.fromUint8Array(new Uint8Array((0, leb128_js_1.safeRead)(b, len)));
}
/**
 * Represents an IDL principal reference
 */
class PrincipalClass extends PrimitiveType {
  accept(v, d) {
    return v.visitPrincipal(this, d);
  }
  covariant(x) {
    if (x && x._isPrincipal) return true;
    throw new Error(`Invalid ${this.display()} argument: ${toReadableString(x)}`);
  }
  encodeValue(x) {
    const buf = x.toUint8Array();
    const len = (0, leb128_js_1.lebEncode)(buf.byteLength);
    return (0, buffer_js_1.concat)(new Uint8Array([1]), len, buf);
  }
  encodeType() {
    return (0, leb128_js_1.slebEncode)(-24 /* IDLTypeIds.Principal */);
  }
  decodeValue(b, t) {
    this.checkType(t);
    return decodePrincipalId(b);
  }
  get name() {
    return 'principal';
  }
  valueToString(x) {
    return `${this.name} "${x.toText()}"`;
  }
}
exports.PrincipalClass = PrincipalClass;
/**
 * Represents an IDL function reference.
 * @param argTypes Argument types.
 * @param retTypes Return types.
 * @param annotations Function annotations.
 */
class FuncClass extends ConstructType {
  constructor(argTypes, retTypes, annotations = []) {
    super();
    this.argTypes = argTypes;
    this.retTypes = retTypes;
    this.annotations = annotations;
  }
  static argsToString(types, v) {
    if (types.length !== v.length) {
      throw new Error('arity mismatch');
    }
    return '(' + types.map((t, i) => t.valueToString(v[i])).join(', ') + ')';
  }
  accept(v, d) {
    return v.visitFunc(this, d);
  }
  covariant(x) {
    if (Array.isArray(x) && x.length === 2 && x[0] && x[0]._isPrincipal && typeof x[1] === 'string')
      return true;
    throw new Error(`Invalid ${this.display()} argument: ${toReadableString(x)}`);
  }
  encodeValue([principal, methodName]) {
    const buf = principal.toUint8Array();
    const len = (0, leb128_js_1.lebEncode)(buf.byteLength);
    const canister = (0, buffer_js_1.concat)(new Uint8Array([1]), len, buf);
    const method = new TextEncoder().encode(methodName);
    const methodLen = (0, leb128_js_1.lebEncode)(method.byteLength);
    return (0, buffer_js_1.concat)(new Uint8Array([1]), canister, methodLen, method);
  }
  _buildTypeTableImpl(T) {
    this.argTypes.forEach(arg => arg.buildTypeTable(T));
    this.retTypes.forEach(arg => arg.buildTypeTable(T));
    const opCode = (0, leb128_js_1.slebEncode)(-22 /* IDLTypeIds.Func */);
    const argLen = (0, leb128_js_1.lebEncode)(this.argTypes.length);
    const args = (0, buffer_js_1.concat)(...this.argTypes.map(arg => arg.encodeType(T)));
    const retLen = (0, leb128_js_1.lebEncode)(this.retTypes.length);
    const rets = (0, buffer_js_1.concat)(...this.retTypes.map(arg => arg.encodeType(T)));
    const annLen = (0, leb128_js_1.lebEncode)(this.annotations.length);
    const anns = (0, buffer_js_1.concat)(...this.annotations.map(a => this.encodeAnnotation(a)));
    T.add(this, (0, buffer_js_1.concat)(opCode, argLen, args, retLen, rets, annLen, anns));
  }
  decodeValue(b) {
    const x = (0, leb128_js_1.safeReadUint8)(b);
    if (x !== 1) {
      throw new Error('Cannot decode function reference');
    }
    const canister = decodePrincipalId(b);
    const mLen = Number((0, leb128_js_1.lebDecode)(b));
    const buf = (0, leb128_js_1.safeRead)(b, mLen);
    const decoder = new TextDecoder('utf8', { fatal: true });
    const method = decoder.decode(buf);
    return [canister, method];
  }
  get name() {
    const args = this.argTypes.map(arg => arg.name).join(', ');
    const rets = this.retTypes.map(arg => arg.name).join(', ');
    const annon = ' ' + this.annotations.join(' ');
    return `(${args}) -> (${rets})${annon}`;
  }
  valueToString([principal, str]) {
    return `func "${principal.toText()}".${str}`;
  }
  display() {
    const args = this.argTypes.map(arg => arg.display()).join(', ');
    const rets = this.retTypes.map(arg => arg.display()).join(', ');
    const annon = ' ' + this.annotations.join(' ');
    return `(${args}) → (${rets})${annon}`;
  }
  encodeAnnotation(ann) {
    if (ann === 'query') {
      return new Uint8Array([1]);
    } else if (ann === 'oneway') {
      return new Uint8Array([2]);
    } else {
      throw new Error('Illegal function annotation');
    }
  }
}
exports.FuncClass = FuncClass;
class ServiceClass extends ConstructType {
  constructor(fields) {
    super();
    this._fields = Object.entries(fields).sort(
      (a, b) => (0, hash_js_1.idlLabelToId)(a[0]) - (0, hash_js_1.idlLabelToId)(b[0]),
    );
  }
  accept(v, d) {
    return v.visitService(this, d);
  }
  covariant(x) {
    if (x && x._isPrincipal) return true;
    throw new Error(`Invalid ${this.display()} argument: ${toReadableString(x)}`);
  }
  encodeValue(x) {
    const buf = x.toUint8Array();
    const len = (0, leb128_js_1.lebEncode)(buf.length);
    return (0, buffer_js_1.concat)(new Uint8Array([1]), len, buf);
  }
  _buildTypeTableImpl(T) {
    this._fields.forEach(([_, func]) => func.buildTypeTable(T));
    const opCode = (0, leb128_js_1.slebEncode)(-23 /* IDLTypeIds.Service */);
    const len = (0, leb128_js_1.lebEncode)(this._fields.length);
    const meths = this._fields.map(([label, func]) => {
      const labelBuf = new TextEncoder().encode(label);
      const labelLen = (0, leb128_js_1.lebEncode)(labelBuf.length);
      return (0, buffer_js_1.concat)(labelLen, labelBuf, func.encodeType(T));
    });
    T.add(this, (0, buffer_js_1.concat)(opCode, len, ...meths));
  }
  decodeValue(b) {
    return decodePrincipalId(b);
  }
  get name() {
    const fields = this._fields.map(([key, value]) => key + ':' + value.name);
    return `service {${fields.join('; ')}}`;
  }
  valueToString(x) {
    return `service "${x.toText()}"`;
  }
}
exports.ServiceClass = ServiceClass;
/**
 *
 * @param x
 * @returns {string}
 */
function toReadableString(x) {
  const str = JSON.stringify(x, (_key, value) =>
    typeof value === 'bigint' ? `BigInt(${value})` : value,
  );
  return str && str.length > toReadableString_max
    ? str.substring(0, toReadableString_max - 3) + '...'
    : str;
}
/**
 * Encode a array of values
 * @param argTypes
 * @param args
 * @returns {Buffer} serialised value
 */
function encode(argTypes, args) {
  if (args.length < argTypes.length) {
    throw Error('Wrong number of message arguments');
  }
  const typeTable = new TypeTable();
  argTypes.forEach(t => t.buildTypeTable(typeTable));
  const magic = new TextEncoder().encode(magicNumber);
  const table = typeTable.encode();
  const len = (0, leb128_js_1.lebEncode)(args.length);
  const typs = (0, buffer_js_1.concat)(...argTypes.map(t => t.encodeType(typeTable)));
  const vals = (0, buffer_js_1.concat)(
    ...zipWith(argTypes, args, (t, x) => {
      try {
        t.covariant(x);
      } catch (e) {
        const err = new Error(e.message + '\n\n');
        throw err;
      }
      return t.encodeValue(x);
    }),
  );
  return (0, buffer_js_1.concat)(magic, table, len, typs, vals);
}
exports.encode = encode;
/**
 * Decode a binary value
 * @param retTypes - Types expected in the buffer.
 * @param bytes - hex-encoded string, or buffer.
 * @returns Value deserialised to JS type
 */
function decode(retTypes, bytes) {
  const b = new buffer_js_1.PipeArrayBuffer(bytes);
  if (bytes.byteLength < magicNumber.length) {
    throw new Error('Message length smaller than magic number');
  }
  const magicBuffer = (0, leb128_js_1.safeRead)(b, magicNumber.length);
  const magic = new TextDecoder().decode(magicBuffer);
  if (magic !== magicNumber) {
    throw new Error('Wrong magic number: ' + JSON.stringify(magic));
  }
  function readTypeTable(pipe) {
    const typeTable = [];
    const len = Number((0, leb128_js_1.lebDecode)(pipe));
    for (let i = 0; i < len; i++) {
      const ty = Number((0, leb128_js_1.slebDecode)(pipe));
      switch (ty) {
        case -18 /* IDLTypeIds.Opt */:
        case -19 /* IDLTypeIds.Vector */: {
          const t = Number((0, leb128_js_1.slebDecode)(pipe));
          typeTable.push([ty, t]);
          break;
        }
        case -20 /* IDLTypeIds.Record */:
        case -21 /* IDLTypeIds.Variant */: {
          const fields = [];
          let objectLength = Number((0, leb128_js_1.lebDecode)(pipe));
          let prevHash;
          while (objectLength--) {
            const hash = Number((0, leb128_js_1.lebDecode)(pipe));
            if (hash >= Math.pow(2, 32)) {
              throw new Error('field id out of 32-bit range');
            }
            if (typeof prevHash === 'number' && prevHash >= hash) {
              throw new Error('field id collision or not sorted');
            }
            prevHash = hash;
            const t = Number((0, leb128_js_1.slebDecode)(pipe));
            fields.push([hash, t]);
          }
          typeTable.push([ty, fields]);
          break;
        }
        case -22 /* IDLTypeIds.Func */: {
          const args = [];
          let argLength = Number((0, leb128_js_1.lebDecode)(pipe));
          while (argLength--) {
            args.push(Number((0, leb128_js_1.slebDecode)(pipe)));
          }
          const returnValues = [];
          let returnValuesLength = Number((0, leb128_js_1.lebDecode)(pipe));
          while (returnValuesLength--) {
            returnValues.push(Number((0, leb128_js_1.slebDecode)(pipe)));
          }
          const annotations = [];
          let annotationLength = Number((0, leb128_js_1.lebDecode)(pipe));
          while (annotationLength--) {
            const annotation = Number((0, leb128_js_1.lebDecode)(pipe));
            switch (annotation) {
              case 1: {
                annotations.push('query');
                break;
              }
              case 2: {
                annotations.push('oneway');
                break;
              }
              default:
                throw new Error('unknown annotation');
            }
          }
          typeTable.push([ty, [args, returnValues, annotations]]);
          break;
        }
        case -23 /* IDLTypeIds.Service */: {
          let servLength = Number((0, leb128_js_1.lebDecode)(pipe));
          const methods = [];
          while (servLength--) {
            const nameLength = Number((0, leb128_js_1.lebDecode)(pipe));
            const funcName = new TextDecoder().decode((0, leb128_js_1.safeRead)(pipe, nameLength));
            const funcType = (0, leb128_js_1.slebDecode)(pipe);
            methods.push([funcName, funcType]);
          }
          typeTable.push([ty, methods]);
          break;
        }
        default:
          throw new Error('Illegal op_code: ' + ty);
      }
    }
    const rawList = [];
    const length = Number((0, leb128_js_1.lebDecode)(pipe));
    for (let i = 0; i < length; i++) {
      rawList.push(Number((0, leb128_js_1.slebDecode)(pipe)));
    }
    return [typeTable, rawList];
  }
  const [rawTable, rawTypes] = readTypeTable(b);
  if (rawTypes.length < retTypes.length) {
    throw new Error('Wrong number of return values');
  }
  const table = rawTable.map(_ => Rec());
  function getType(t) {
    if (t < -24) {
      throw new Error('future value not supported');
    }
    if (t < 0) {
      switch (t) {
        case -1:
          return exports.Null;
        case -2:
          return exports.Bool;
        case -3:
          return exports.Nat;
        case -4:
          return exports.Int;
        case -5:
          return exports.Nat8;
        case -6:
          return exports.Nat16;
        case -7:
          return exports.Nat32;
        case -8:
          return exports.Nat64;
        case -9:
          return exports.Int8;
        case -10:
          return exports.Int16;
        case -11:
          return exports.Int32;
        case -12:
          return exports.Int64;
        case -13:
          return exports.Float32;
        case -14:
          return exports.Float64;
        case -15:
          return exports.Text;
        case -16:
          return exports.Reserved;
        case -17:
          return exports.Empty;
        case -24:
          return exports.Principal;
        default:
          throw new Error('Illegal op_code: ' + t);
      }
    }
    if (t >= rawTable.length) {
      throw new Error('type index out of range');
    }
    return table[t];
  }
  function buildType(entry) {
    switch (entry[0]) {
      case -19 /* IDLTypeIds.Vector */: {
        const ty = getType(entry[1]);
        return Vec(ty);
      }
      case -18 /* IDLTypeIds.Opt */: {
        const ty = getType(entry[1]);
        return Opt(ty);
      }
      case -20 /* IDLTypeIds.Record */: {
        const fields = {};
        for (const [hash, ty] of entry[1]) {
          const name = `_${hash}_`;
          fields[name] = getType(ty);
        }
        const record = Record(fields);
        const tuple = record.tryAsTuple();
        if (Array.isArray(tuple)) {
          return Tuple(...tuple);
        } else {
          return record;
        }
      }
      case -21 /* IDLTypeIds.Variant */: {
        const fields = {};
        for (const [hash, ty] of entry[1]) {
          const name = `_${hash}_`;
          fields[name] = getType(ty);
        }
        return Variant(fields);
      }
      case -22 /* IDLTypeIds.Func */: {
        const [args, returnValues, annotations] = entry[1];
        return Func(
          args.map(t => getType(t)),
          returnValues.map(t => getType(t)),
          annotations,
        );
      }
      case -23 /* IDLTypeIds.Service */: {
        const rec = {};
        const methods = entry[1];
        for (const [name, typeRef] of methods) {
          let type = getType(typeRef);
          if (type instanceof RecClass) {
            // unpack reference type
            type = type.getType();
          }
          if (!(type instanceof FuncClass)) {
            throw new Error('Illegal service definition: services can only contain functions');
          }
          rec[name] = type;
        }
        return Service(rec);
      }
      default:
        throw new Error('Illegal op_code: ' + entry[0]);
    }
  }
  rawTable.forEach((entry, i) => {
    const t = buildType(entry);
    table[i].fill(t);
  });
  const types = rawTypes.map(t => getType(t));
  const output = retTypes.map((t, i) => {
    return t.decodeValue(b, types[i]);
  });
  // skip unused values
  for (let ind = retTypes.length; ind < types.length; ind++) {
    types[ind].decodeValue(b, types[ind]);
  }
  if (b.byteLength > 0) {
    throw new Error('decode: Left-over bytes');
  }
  return output;
}
exports.decode = decode;
// Export Types instances.
exports.Empty = new EmptyClass();
exports.Reserved = new ReservedClass();
/**
 * Client-only type for deserializing unknown data. Not supported by Candid, and its use is discouraged.
 */
exports.Unknown = new UnknownClass();
exports.Bool = new BoolClass();
exports.Null = new NullClass();
exports.Text = new TextClass();
exports.Int = new IntClass();
exports.Nat = new NatClass();
exports.Float32 = new FloatClass(32);
exports.Float64 = new FloatClass(64);
exports.Int8 = new FixedIntClass(8);
exports.Int16 = new FixedIntClass(16);
exports.Int32 = new FixedIntClass(32);
exports.Int64 = new FixedIntClass(64);
exports.Nat8 = new FixedNatClass(8);
exports.Nat16 = new FixedNatClass(16);
exports.Nat32 = new FixedNatClass(32);
exports.Nat64 = new FixedNatClass(64);
exports.Principal = new PrincipalClass();
/**
 *
 * @param types array of any types
 * @returns TupleClass from those types
 */
function Tuple(...types) {
  return new TupleClass(types);
}
exports.Tuple = Tuple;
/**
 *
 * @param t IDL Type
 * @returns VecClass from that type
 */
function Vec(t) {
  return new VecClass(t);
}
exports.Vec = Vec;
/**
 *
 * @param t IDL Type
 * @returns OptClass of Type
 */
function Opt(t) {
  return new OptClass(t);
}
exports.Opt = Opt;
/**
 *
 * @param t Record of string and IDL Type
 * @returns RecordClass of string and Type
 */
function Record(t) {
  return new RecordClass(t);
}
exports.Record = Record;
/**
 *
 * @param fields Record of string and IDL Type
 * @returns VariantClass
 */
function Variant(fields) {
  return new VariantClass(fields);
}
exports.Variant = Variant;
/**
 *
 * @returns new RecClass
 */
function Rec() {
  return new RecClass();
}
exports.Rec = Rec;
/**
 *
 * @param args array of IDL Types
 * @param ret array of IDL Types
 * @param annotations array of strings, [] by default
 * @returns new FuncClass
 */
function Func(args, ret, annotations = []) {
  return new FuncClass(args, ret, annotations);
}
exports.Func = Func;
/**
 *
 * @param t Record of string and FuncClass
 * @returns ServiceClass
 */
function Service(t) {
  return new ServiceClass(t);
}
exports.Service = Service;
//# sourceMappingURL=idl.js.map
