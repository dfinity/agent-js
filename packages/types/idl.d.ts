import { AbstractPrincipal } from './principal';
import { JsonValue } from './agent';

export interface Pipe {
  buffer: ArrayBuffer;
  byteLength: number;
  read(num: number): ArrayBuffer;
  readUint8(): number | undefined;
  write(buf: ArrayBuffer): void;
  end: boolean;
  alloc(amount: number): void;
}

/**
 * An IDL Type Table, which precedes the data in the stream.
 */
declare class TypeTable {
  private _typs;
  private _idx;
  has(obj: ConstructType): boolean;
  add<T>(type: ConstructType<T>, buf: ArrayBuffer): void;
  merge<T>(obj: ConstructType<T>, knot: string): void;
  encode(): ArrayBuffer;
  indexOf(typeName: string): ArrayBuffer;
}
export declare abstract class Visitor<D, R> {
  visitType<T>(t: Type<T>, data: D): R;
  visitPrimitive<T>(t: PrimitiveType<T>, data: D): R;
  visitEmpty(t: EmptyClass, data: D): R;
  visitBool(t: BoolClass, data: D): R;
  visitNull(t: NullClass, data: D): R;
  visitReserved(t: ReservedClass, data: D): R;
  visitText(t: TextClass, data: D): R;
  visitNumber<T>(t: PrimitiveType<T>, data: D): R;
  visitInt(t: IntClass, data: D): R;
  visitNat(t: NatClass, data: D): R;
  visitFloat(t: FloatClass, data: D): R;
  visitFixedInt(t: FixedIntClass, data: D): R;
  visitFixedNat(t: FixedNatClass, data: D): R;
  visitPrincipal(t: PrincipalClass, data: D): R;
  visitConstruct<T>(t: ConstructType<T>, data: D): R;
  visitVec<T>(t: VecClass<T>, ty: Type<T>, data: D): R;
  visitOpt<T>(t: OptClass<T>, ty: Type<T>, data: D): R;
  visitRecord(t: RecordClass, fields: Array<[string, Type]>, data: D): R;
  visitTuple<T extends any[]>(t: TupleClass<T>, components: Type[], data: D): R;
  visitVariant(t: VariantClass, fields: Array<[string, Type]>, data: D): R;
  visitRec<T>(t: RecClass<T>, ty: ConstructType<T>, data: D): R;
  visitFunc(t: FuncClass, data: D): R;
  visitService(t: ServiceClass, data: D): R;
}
/**
 * Represents an IDL type.
 */
export declare abstract class Type<T = any> {
  abstract readonly name: string;
  abstract accept<D, R>(v: Visitor<D, R>, d: D): R;
  display(): string;
  valueToString(x: T): string;
  buildTypeTable(typeTable: TypeTable): void;
  /**
   * Assert that JavaScript's `x` is the proper type represented by this
   * Type.
   */
  abstract covariant(x: any): x is T;
  /**
   * Encode the value. This needs to be public because it is used by
   * encodeValue() from different types.
   * @internal
   */
  abstract encodeValue(x: T): ArrayBuffer;
  /**
   * Implement `I` in the IDL spec.
   * Encode this type for the type table.
   */
  abstract encodeType(typeTable: TypeTable): ArrayBuffer;
  abstract checkType(t: Type): Type;
  abstract decodeValue(x: Pipe, t: Type): T;
  protected abstract _buildTypeTableImpl(typeTable: TypeTable): void;
}
export declare abstract class PrimitiveType<T = any> extends Type<T> {
  checkType(t: Type): Type;
  _buildTypeTableImpl(typeTable: TypeTable): void;
}
export declare abstract class ConstructType<T = any> extends Type<T> {
  checkType(t: Type): ConstructType<T>;
  encodeType(typeTable: TypeTable): ArrayBuffer;
}
/**
 * Represents an IDL Empty, a type which has no inhabitants.
 * Since no values exist for this type, it cannot be serialised or deserialised.
 * Result types like `Result<Text, Empty>` should always succeed.
 */
export declare class EmptyClass extends PrimitiveType<never> {
  accept<D, R>(v: Visitor<D, R>, d: D): R;
  covariant(x: any): x is never;
  encodeValue(): never;
  valueToString(): never;
  encodeType(): ArrayBuffer;
  decodeValue(): never;
  get name(): string;
}
/**
 * Represents an IDL Unknown, a placeholder type for deserialization only.
 * When decoding a value as Unknown, all fields will be retained but the names are only available in
 * hashed form.
 * A deserialized unknown will offer it's actual type by calling the `type()` function.
 * Unknown cannot be serialized and attempting to do so will throw an error.
 */
export declare class UnknownClass extends Type {
  checkType(t: Type): Type;
  accept<D, R>(v: Visitor<D, R>, d: D): R;
  covariant(x: any): x is any;
  encodeValue(): never;
  valueToString(): never;
  encodeType(): never;
  decodeValue(b: Pipe, t: Type): any;
  protected _buildTypeTableImpl(): void;
  get name(): string;
}
/**
 * Represents an IDL Bool
 */
export declare class BoolClass extends PrimitiveType<boolean> {
  accept<D, R>(v: Visitor<D, R>, d: D): R;
  covariant(x: any): x is boolean;
  encodeValue(x: boolean): ArrayBuffer;
  encodeType(): ArrayBuffer;
  decodeValue(b: Pipe, t: Type): boolean;
  get name(): string;
}
/**
 * Represents an IDL Null
 */
export declare class NullClass extends PrimitiveType<null> {
  accept<D, R>(v: Visitor<D, R>, d: D): R;
  covariant(x: any): x is null;
  encodeValue(): ArrayBuffer;
  encodeType(): ArrayBuffer;
  decodeValue(b: Pipe, t: Type): null;
  get name(): string;
}
/**
 * Represents an IDL Reserved
 */
export declare class ReservedClass extends PrimitiveType<any> {
  accept<D, R>(v: Visitor<D, R>, d: D): R;
  covariant(x: any): x is any;
  encodeValue(): ArrayBuffer;
  encodeType(): ArrayBuffer;
  decodeValue(b: Pipe, t: Type): null;
  get name(): string;
}
/**
 * Represents an IDL Text
 */
export declare class TextClass extends PrimitiveType<string> {
  accept<D, R>(v: Visitor<D, R>, d: D): R;
  covariant(x: any): x is string;
  encodeValue(x: string): ArrayBuffer;
  encodeType(): ArrayBuffer;
  decodeValue(b: Pipe, t: Type): string;
  get name(): string;
  valueToString(x: string): string;
}
/**
 * Represents an IDL Int
 */
export declare class IntClass extends PrimitiveType<bigint> {
  accept<D, R>(v: Visitor<D, R>, d: D): R;
  covariant(x: any): x is bigint;
  encodeValue(x: bigint | number): ArrayBuffer;
  encodeType(): ArrayBuffer;
  decodeValue(b: Pipe, t: Type): bigint;
  get name(): string;
  valueToString(x: bigint): string;
}
/**
 * Represents an IDL Nat
 */
export declare class NatClass extends PrimitiveType<bigint> {
  accept<D, R>(v: Visitor<D, R>, d: D): R;
  covariant(x: any): x is bigint;
  encodeValue(x: bigint | number): ArrayBuffer;
  encodeType(): ArrayBuffer;
  decodeValue(b: Pipe, t: Type): bigint;
  get name(): string;
  valueToString(x: bigint): string;
}
/**
 * Represents an IDL Float
 */
export declare class FloatClass extends PrimitiveType<number> {
  private _bits;
  constructor(_bits: number);
  accept<D, R>(v: Visitor<D, R>, d: D): R;
  covariant(x: any): x is number;
  encodeValue(x: number): ArrayBuffer;
  encodeType(): ArrayBuffer;
  decodeValue(b: Pipe, t: Type): number;
  get name(): string;
  valueToString(x: number): string;
}
/**
 * Represents an IDL fixed-width Int(n)
 */
export declare class FixedIntClass extends PrimitiveType<bigint | number> {
  readonly _bits: number;
  constructor(_bits: number);
  accept<D, R>(v: Visitor<D, R>, d: D): R;
  covariant(x: any): x is bigint;
  encodeValue(x: bigint | number): ArrayBuffer;
  encodeType(): ArrayBuffer;
  decodeValue(b: Pipe, t: Type): number | bigint;
  get name(): string;
  valueToString(x: bigint | number): string;
}
/**
 * Represents an IDL fixed-width Nat(n)
 */
export declare class FixedNatClass extends PrimitiveType<bigint | number> {
  readonly _bits: number;
  constructor(_bits: number);
  accept<D, R>(v: Visitor<D, R>, d: D): R;
  covariant(x: any): x is bigint;
  encodeValue(x: bigint | number): ArrayBuffer;
  encodeType(): ArrayBuffer;
  decodeValue(b: Pipe, t: Type): number | bigint;
  get name(): string;
  valueToString(x: bigint | number): string;
}
/**
 * Represents an IDL Array
 *
 * Arrays of fixed-sized nat/int type (e.g. nat8), are encoded from and decoded to TypedArrays (e.g. Uint8Array).
 * Arrays of float or other non-primitive types are encoded/decoded as untyped array in Javascript.
 *
 * @param {Type} t
 */
export declare class VecClass<T> extends ConstructType<T[]> {
  protected _type: Type<T>;
  private _blobOptimization;
  constructor(_type: Type<T>);
  accept<D, R>(v: Visitor<D, R>, d: D): R;
  covariant(x: any): x is T[];
  encodeValue(x: T[]): ArrayBuffer;
  _buildTypeTableImpl(typeTable: TypeTable): void;
  decodeValue(b: Pipe, t: Type): T[];
  get name(): string;
  display(): string;
  valueToString(x: T[]): string;
}
/**
 * Represents an IDL Option
 * @param {Type} t
 */
export declare class OptClass<T> extends ConstructType<[T] | []> {
  protected _type: Type<T>;
  constructor(_type: Type<T>);
  accept<D, R>(v: Visitor<D, R>, d: D): R;
  covariant(x: any): x is [T] | [];
  encodeValue(x: [T] | []): ArrayBuffer;
  _buildTypeTableImpl(typeTable: TypeTable): void;
  decodeValue(b: Pipe, t: Type): [T] | [];
  get name(): string;
  display(): string;
  valueToString(x: [T] | []): string;
}
/**
 * Represents an IDL Record
 * @param {Object} [fields] - mapping of function name to Type
 */
export declare class RecordClass extends ConstructType<Record<string, any>> {
  protected readonly _fields: Array<[string, Type]>;
  constructor(fields?: Record<string, Type>);
  accept<D, R>(v: Visitor<D, R>, d: D): R;
  tryAsTuple(): Type[] | null;
  covariant(x: any): x is Record<string, any>;
  encodeValue(x: Record<string, any>): ArrayBuffer;
  _buildTypeTableImpl(T: TypeTable): void;
  decodeValue(b: Pipe, t: Type): Record<string, any>;
  get name(): string;
  display(): string;
  valueToString(x: Record<string, any>): string;
}
/**
 * Represents Tuple, a syntactic sugar for Record.
 * @param {Type} components
 */
export declare class TupleClass<T extends any[]> extends RecordClass {
  protected readonly _components: Type[];
  constructor(_components: Type[]);
  accept<D, R>(v: Visitor<D, R>, d: D): R;
  covariant(x: any): x is T;
  encodeValue(x: any[]): ArrayBuffer;
  decodeValue(b: Pipe, t: Type): T;
  display(): string;
  valueToString(values: any[]): string;
}
/**
 * Represents an IDL Variant
 * @param {Object} [fields] - mapping of function name to Type
 */
export declare class VariantClass extends ConstructType<Record<string, any>> {
  private readonly _fields;
  constructor(fields?: Record<string, Type>);
  accept<D, R>(v: Visitor<D, R>, d: D): R;
  covariant(x: any): x is Record<string, any>;
  encodeValue(x: Record<string, any>): ArrayBuffer;
  _buildTypeTableImpl(typeTable: TypeTable): void;
  decodeValue(
    b: Pipe,
    t: Type,
  ): {
    [x: string]: any;
  };
  get name(): string;
  display(): string;
  valueToString(x: Record<string, any>): string;
}
/**
 * Represents a reference to an IDL type, used for defining recursive data
 * types.
 */
export declare class RecClass<T = any> extends ConstructType<T> {
  private static _counter;
  private _id;
  private _type;
  accept<D, R>(v: Visitor<D, R>, d: D): R;
  fill(t: ConstructType<T>): void;
  getType(): ConstructType<T> | undefined;
  covariant(x: any): x is T;
  encodeValue(x: T): ArrayBuffer;
  _buildTypeTableImpl(typeTable: TypeTable): void;
  decodeValue(b: Pipe, t: Type): T;
  get name(): string;
  display(): string;
  valueToString(x: T): string;
}
/**
 * Represents an IDL principal reference
 */
export declare class PrincipalClass extends PrimitiveType<AbstractPrincipal> {
  accept<D, R>(v: Visitor<D, R>, d: D): R;
  covariant(x: any): x is AbstractPrincipal;
  encodeValue(x: AbstractPrincipal): ArrayBuffer;
  encodeType(): ArrayBuffer;
  decodeValue(b: Pipe, t: Type): AbstractPrincipal;
  get name(): string;
  valueToString(x: AbstractPrincipal): string;
}
/**
 * Represents an IDL function reference.
 * @param argTypes Argument types.
 * @param retTypes Return types.
 * @param annotations Function annotations.
 */
export declare class FuncClass extends ConstructType<[AbstractPrincipal, string]> {
  argTypes: Type[];
  retTypes: Type[];
  annotations: string[];
  static argsToString(types: Type[], v: any[]): string;
  constructor(argTypes: Type[], retTypes: Type[], annotations?: string[]);
  accept<D, R>(v: Visitor<D, R>, d: D): R;
  covariant(x: any): x is [AbstractPrincipal, string];
  encodeValue([principal, methodName]: [AbstractPrincipal, string]): ArrayBuffer;
  _buildTypeTableImpl(T: TypeTable): void;
  decodeValue(b: Pipe): [AbstractPrincipal, string];
  get name(): string;
  valueToString([principal, str]: [AbstractPrincipal, string]): string;
  display(): string;
  private encodeAnnotation;
}
export declare class ServiceClass extends ConstructType<AbstractPrincipal> {
  readonly _fields: Array<[string, FuncClass]>;
  constructor(fields: Record<string, FuncClass>);
  accept<D, R>(v: Visitor<D, R>, d: D): R;
  covariant(x: any): x is AbstractPrincipal;
  encodeValue(x: AbstractPrincipal): ArrayBuffer;
  _buildTypeTableImpl(T: TypeTable): void;
  decodeValue(b: Pipe): AbstractPrincipal;
  get name(): string;
  valueToString(x: AbstractPrincipal): string;
}
/**
 * Encode a array of values
 * @param argTypes
 * @param args
 * @returns {Buffer} serialised value
 */
export declare function encode(argTypes: Array<Type<any>>, args: any[]): ArrayBuffer;
/**
 * Decode a binary value
 * @param retTypes - Types expected in the buffer.
 * @param bytes - hex-encoded string, or buffer.
 * @returns Value deserialised to JS type
 */
export declare function decode(retTypes: Type[], bytes: ArrayBuffer): JsonValue[];
/**
 * An Interface Factory, normally provided by a Candid code generation.
 */
export declare type InterfaceFactory = (idl: {
  IDL: {
    Empty: EmptyClass;
    Reserved: ReservedClass;
    Unknown: UnknownClass;
    Bool: BoolClass;
    Null: NullClass;
    Text: TextClass;
    Int: IntClass;
    Nat: NatClass;
    Float32: FloatClass;
    Float64: FloatClass;
    Int8: FixedIntClass;
    Int16: FixedIntClass;
    Int32: FixedIntClass;
    Int64: FixedIntClass;
    Nat8: FixedNatClass;
    Nat16: FixedNatClass;
    Nat32: FixedNatClass;
    Nat64: FixedNatClass;
    Principal: PrincipalClass;
    Tuple: typeof Tuple;
    Vec: typeof Vec;
    Opt: typeof Opt;
    Record: typeof Record;
    Variant: typeof Variant;
    Rec: typeof Rec;
    Func: typeof Func;
    Service(t: Record<string, FuncClass>): ServiceClass;
  };
}) => ServiceClass;
export declare const Empty: EmptyClass;
export declare const Reserved: ReservedClass;
/**
 * Client-only type for deserializing unknown data. Not supported by Candid, and its use is discouraged.
 */
export declare const Unknown: UnknownClass;
export declare const Bool: BoolClass;
export declare const Null: NullClass;
export declare const Text: TextClass;
export declare const Int: IntClass;
export declare const Nat: NatClass;
export declare const Float32: FloatClass;
export declare const Float64: FloatClass;
export declare const Int8: FixedIntClass;
export declare const Int16: FixedIntClass;
export declare const Int32: FixedIntClass;
export declare const Int64: FixedIntClass;
export declare const Nat8: FixedNatClass;
export declare const Nat16: FixedNatClass;
export declare const Nat32: FixedNatClass;
export declare const Nat64: FixedNatClass;
export declare const Principal: PrincipalClass;
/**
 *
 * @param types array of any types
 * @returns TupleClass from those types
 */
export declare function Tuple<T extends any[]>(...types: T): TupleClass<T>;
/**
 *
 * @param t IDL Type
 * @returns VecClass from that type
 */
export declare function Vec<T>(t: Type<T>): VecClass<T>;
/**
 *
 * @param t IDL Type
 * @returns OptClass of Type
 */
export declare function Opt<T>(t: Type<T>): OptClass<T>;
/**
 *
 * @param t Record of string and IDL Type
 * @returns RecordClass of string and Type
 */
export declare function Record(t: Record<string, Type>): RecordClass;
/**
 *
 * @param fields Record of string and IDL Type
 * @returns VariantClass
 */
export declare function Variant(fields: Record<string, Type>): VariantClass;
/**
 *
 * @returns new RecClass
 */
export declare function Rec(): RecClass;
/**
 *
 * @param args array of IDL Types
 * @param ret array of IDL Types
 * @param annotations array of strings, [] by default
 * @returns new FuncClass
 */
export declare function Func(args: Type[], ret: Type[], annotations?: string[]): FuncClass;
/**
 *
 * @param t Record of string and FuncClass
 * @returns ServiceClass
 */
export declare function Service(t: Record<string, FuncClass>): ServiceClass;
export {};
