/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
/*
 * @jest-environment node
 */
import * as IDL from './idl';
import { Principal } from '@dfinity/principal';
import { fromHexString, toHexString } from './utils/buffer';
import { idlLabelToId } from './utils/hash';

function testEncode(typ: IDL.Type, val: any, hex: string, _str: string) {
  expect(toHexString(IDL.encode([typ], [val]))).toEqual(hex);
}

function testDecode(typ: IDL.Type, val: any, hex: string, _str: string) {
  expect(IDL.decode([typ], fromHexString(hex))[0]).toEqual(val);
}

function testDecodeFail(typ: IDL.Type, hex: string, _str: string) {
  expect(() => IDL.decode([typ], fromHexString(hex))[0]).toThrow();
}

function test_(typ: IDL.Type, val: any, hex: string, str: string) {
  testEncode(typ, val, hex, str);
  testDecode(typ, val, hex, str);
}

function test_args(typs: IDL.Type[], vals: any[], hex: string, _str: string) {
  expect(IDL.encode(typs, vals)).toEqual(fromHexString(hex));
  expect(IDL.decode(typs, fromHexString(hex))).toEqual(vals);
}

function hashedPropertyName(name: string) {
  return '_' + idlLabelToId(name) + '_';
}

test('IDL encoding (magic number)', () => {
  // Wrong magic number
  expect(() => IDL.decode([IDL.Nat], fromHexString('2a'))).toThrow(
    /Message length smaller than magic number/,
  );
  expect(() => IDL.decode([IDL.Nat], fromHexString('4449444d2a'))).toThrow(/Wrong magic number:/);
});

test('IDL encoding (empty)', () => {
  // Empty
  expect(() => IDL.encode([IDL.Empty], [undefined])).toThrow(/Invalid empty argument:/);
  expect(() => IDL.decode([IDL.Empty], fromHexString('4449444c00016f'))).toThrow(
    /Empty cannot appear as an output/,
  );
});

test('IDL encoding (null)', () => {
  // Null
  test_(IDL.Null, null, '4449444c00017f', 'Null value');
});

test('IDL encoding (text)', () => {
  // Text
  test_(IDL.Text, 'Hi ☃\n', '4449444c00017107486920e298830a', 'Text with unicode');
  test_(
    IDL.Opt(IDL.Text),
    ['Hi ☃\n'],
    '4449444c016e7101000107486920e298830a',
    'Nested text with unicode',
  );
  expect(() => IDL.encode([IDL.Text], [0])).toThrow(/Invalid text argument/);
  expect(() => IDL.encode([IDL.Text], [null])).toThrow(/Invalid text argument/);
  expect(() =>
    IDL.decode([IDL.Vec(IDL.Nat8)], fromHexString('4449444c00017107486920e298830a')),
  ).toThrow(/type mismatch: type on the wire text, expect type vec nat8/);
});

test('IDL encoding (int)', () => {
  // Int
  test_(IDL.Int, BigInt(0), '4449444c00017c00', 'Int');
  test_(IDL.Int, BigInt(42), '4449444c00017c2a', 'Int');
  test_(IDL.Int, BigInt(1234567890), '4449444c00017cd285d8cc04', 'Positive Int');
  test_(
    IDL.Int,
    BigInt('60000000000000000'),
    '4449444c00017c808098f4e9b5caea00',
    'Positive BigInt',
  );
  test_(IDL.Int, BigInt(-1234567890), '4449444c00017caefaa7b37b', 'Negative Int');
  test_(IDL.Opt(IDL.Int), [BigInt(42)], '4449444c016e7c0100012a', 'Nested Int');
  testEncode(IDL.Opt(IDL.Int), [42], '4449444c016e7c0100012a', 'Nested Int (number)');
  expect(() => IDL.decode([IDL.Int], fromHexString('4449444c00017d2a'))).toThrow(
    /type mismatch: type on the wire nat, expect type int/,
  );
});

test('IDL encoding (nat)', () => {
  // Nat
  test_(IDL.Nat, BigInt(42), '4449444c00017d2a', 'Nat');
  test_(IDL.Nat, BigInt(0), '4449444c00017d00', 'Nat of 0');
  test_(IDL.Nat, BigInt(1234567890), '4449444c00017dd285d8cc04', 'Positive Nat');
  test_(IDL.Nat, BigInt('60000000000000000'), '4449444c00017d808098f4e9b5ca6a', 'Positive BigInt');
  testEncode(IDL.Opt(IDL.Nat), [42], '4449444c016e7d0100012a', 'Nested Nat (number)');
  expect(() => IDL.encode([IDL.Nat], [-1])).toThrow(/Invalid nat argument/);
});

test('IDL encoding (float64)', () => {
  // Float64
  test_(IDL.Float64, 3, '4449444c0001720000000000000840', 'Float');
  test_(IDL.Float64, 6, '4449444c0001720000000000001840', 'Float');
  test_(IDL.Float64, 0.5, '4449444c000172000000000000e03f', 'Float');
  test_(IDL.Float64, Number.NaN, '4449444c000172000000000000f87f', 'NaN');
  testDecode(IDL.Float64, Number.NaN, '4449444c000172010000000000f07f', 'NaN');
  test_(IDL.Float64, Number.POSITIVE_INFINITY, '4449444c000172000000000000f07f', '+infinity');
  test_(IDL.Float64, Number.NEGATIVE_INFINITY, '4449444c000172000000000000f0ff', '-infinity');
  test_(IDL.Float64, Number.EPSILON, '4449444c000172000000000000b03c', 'eps');
  test_(IDL.Float64, Number.MIN_VALUE, '4449444c0001720100000000000000', 'min_value');
  test_(IDL.Float64, Number.MAX_VALUE, '4449444c000172ffffffffffffef7f', 'max_value');
  test_(IDL.Float64, Number.MIN_SAFE_INTEGER, '4449444c000172ffffffffffff3fc3', 'min_safe_integer');
  test_(IDL.Float64, Number.MAX_SAFE_INTEGER, '4449444c000172ffffffffffff3f43', 'max_safe_integer');
});

test('IDL encoding (fixed-width number)', () => {
  // Fixed-width number
  test_(IDL.Int8, 0, '4449444c00017700', 'Int8');
  test_(IDL.Int8, -1, '4449444c000177ff', 'Int8');
  test_(IDL.Int8, 42, '4449444c0001772a', 'Int8');
  test_(IDL.Int8, 127, '4449444c0001777f', 'Int8');
  test_(IDL.Int8, -128, '4449444c00017780', 'Int8');
  test_(IDL.Int32, 42, '4449444c0001752a000000', 'Int32');
  test_(IDL.Int32, -42, '4449444c000175d6ffffff', 'Negative Int32');
  test_(IDL.Int32, 1234567890, '4449444c000175d2029649', 'Positive Int32');
  test_(IDL.Int32, -1234567890, '4449444c0001752efd69b6', 'Negative Int32');
  test_(IDL.Int32, -0x7fffffff, '4449444c00017501000080', 'Negative Int32');
  test_(IDL.Int32, 0x7fffffff, '4449444c000175ffffff7f', 'Positive Int32');
  test_(IDL.Int64, BigInt(42), '4449444c0001742a00000000000000', 'Int64');
  test_(IDL.Int64, BigInt(-42), '4449444c000174d6ffffffffffffff', 'Int64');
  test_(IDL.Int64, BigInt(1234567890), '4449444c000174d202964900000000', 'Positive Int64');
  test_(IDL.Nat8, 42, '4449444c00017b2a', 'Nat8');
  test_(IDL.Nat8, 0, '4449444c00017b00', 'Nat8');
  test_(IDL.Nat8, 255, '4449444c00017bff', 'Nat8');
  test_(IDL.Nat32, 0, '4449444c00017900000000', 'Nat32');
  test_(IDL.Nat32, 42, '4449444c0001792a000000', 'Nat32');
  test_(IDL.Nat32, 0xffffffff, '4449444c000179ffffffff', 'Nat32');
  test_(IDL.Nat64, BigInt(1234567890), '4449444c000178d202964900000000', 'Positive Nat64');
  expect(() => IDL.encode([IDL.Nat32], [-42])).toThrow(/Invalid nat32 argument/);
  expect(() => IDL.encode([IDL.Int8], [256])).toThrow(/Invalid int8 argument/);
  expect(() => IDL.encode([IDL.Int32], [0xffffffff])).toThrow(/Invalid int32 argument/);
});

test('IDL encoding (tuple)', () => {
  // Tuple
  test_(
    IDL.Tuple(IDL.Int, IDL.Text),
    [BigInt(42), '💩'],
    '4449444c016c02007c017101002a04f09f92a9',
    'Pairs',
  );
  expect(() => IDL.encode([IDL.Tuple(IDL.Int, IDL.Text)], [[0]])).toThrow(
    /Invalid record {int; text} argument/,
  );
});

test('IDL encoding (arraybuffer)', () => {
  test_(
    IDL.Vec(IDL.Nat8),
    new Uint8Array([0, 1, 2, 3]),
    '4449444c016d7b01000400010203',
    'Array of Nat8s',
  );
  test_(
    IDL.Vec(IDL.Int8),
    new Int8Array([0, 1, 2, 3]),
    '4449444c016d7701000400010203',
    'Array of Int8s',
  );
  test_(
    IDL.Vec(IDL.Int16),
    new Int16Array([0, 1, 2, 3, 32767, -1]),
    '4449444c016d760100060000010002000300ff7fffff',
    'Array of Int16s',
  );
  test_(
    IDL.Vec(IDL.Nat64),
    new BigUint64Array([BigInt(0), BigInt(1), BigInt(1) << BigInt(60), BigInt(13)]),
    '4449444c016d780100040000000000000000010000000000000000000000000000100d00000000000000',
    'Array of Nat64s',
  );
  IDL.encode([IDL.Vec(IDL.Nat8)], [new Uint8Array()]);
  IDL.encode([IDL.Vec(IDL.Nat8)], [new Uint8Array(100).fill(42)]);
  IDL.encode([IDL.Vec(IDL.Nat16)], [new Uint16Array(200).fill(42)]);
  expect(() => IDL.encode([IDL.Vec(IDL.Int8)], [new Uint16Array(10).fill(420)])).toThrow(
    /Invalid vec int8 argument/,
  );
});

test('IDL encoding (array)', () => {
  // Array
  test_(
    IDL.Vec(IDL.Int),
    [0, 1, 2, 3].map(x => BigInt(x)),
    '4449444c016d7c01000400010203',
    'Array of Ints',
  );
  IDL.encode([IDL.Vec(IDL.Nat16)], [new Array(200000).fill(42)]);
  expect(() => IDL.encode([IDL.Vec(IDL.Int)], [BigInt(0)])).toThrow(/Invalid vec int argument/);
  expect(() => IDL.encode([IDL.Vec(IDL.Int)], [['fail']])).toThrow(/Invalid vec int argument/);
});

test('IDL encoding (array + tuples)', () => {
  // Array of Tuple
  test_(
    IDL.Vec(IDL.Tuple(IDL.Int, IDL.Text)),
    [[BigInt(42), 'text']],
    '4449444c026c02007c01716d000101012a0474657874',
    'Arr of Tuple',
  );

  // Nested Tuples
  test_(
    IDL.Tuple(IDL.Tuple(IDL.Tuple(IDL.Tuple(IDL.Null)))),
    [[[[null]]]],
    '4449444c046c01007f6c0100006c0100016c0100020103',
    'Nested Tuples',
  );
});

test('IDL encoding (record)', () => {
  // Record
  test_(IDL.Record({}), {}, '4449444c016c000100', 'Empty record');
  expect(() => IDL.encode([IDL.Record({ a: IDL.Text })], [{ b: 'b' }])).toThrow(
    /Record is missing key/,
  );

  // Test that additional keys are ignored
  testEncode(
    IDL.Record({ foo: IDL.Text, bar: IDL.Int }),
    { foo: '💩', bar: BigInt(42), baz: BigInt(0) },
    '4449444c016c02d3e3aa027c868eb7027101002a04f09f92a9',
    'Record',
  );
  testEncode(
    IDL.Record({ foo: IDL.Text, bar: IDL.Int }),
    { foo: '💩', bar: 42 },
    '4449444c016c02d3e3aa027c868eb7027101002a04f09f92a9',
    'Record',
  );
});

test('IDL decoding (skip fields)', () => {
  testDecode(
    IDL.Record({ a: IDL.Opt(IDL.Text) }),
    { a: [] },
    '4449444c016c000100',
    'optional field',
  );
  testDecode(
    IDL.Record({ foo: IDL.Text, bar: IDL.Int }),
    { foo: '💩', bar: BigInt(42) },
    '4449444c016c04017f027ed3e3aa027c868eb702710100012a04f09f92a9',
    'ignore record fields',
  );
  testDecode(
    IDL.Variant({ ok: IDL.Text, err: IDL.Text }),
    { ok: 'good' },
    '4449444c016b03017e9cc20171e58eb4027101000104676f6f64',
    'adjust variant index',
  );
  const recordType = IDL.Record({ foo: IDL.Int32, bar: IDL.Bool });
  const recordValue = { foo: 42, bar: true };
  test_(
    IDL.Record({ foo: IDL.Int32, bar: recordType, baz: recordType, bib: recordType }),
    { foo: 42, bar: recordValue, baz: recordValue, bib: recordValue },
    '4449444c026c02d3e3aa027e868eb702756c04d3e3aa0200dbe3aa0200bbf1aa0200868eb702750101012a000000012a000000012a0000002a000000',
    'nested record',
  );
  testDecode(
    IDL.Record({ baz: IDL.Record({ foo: IDL.Int32 }) }),
    { baz: { foo: 42 } },
    '4449444c026c02d3e3aa027e868eb702756c04d3e3aa0200dbe3aa0200bbf1aa0200868eb702750101012a000000012a000000012a0000002a000000',
    'skip nested fields',
  );
});

test('IDL encoding (numbered record)', () => {
  // Record
  test_(
    IDL.Record({ _0_: IDL.Int8, _1_: IDL.Bool }),
    { _0_: 42, _1_: true },
    '4449444c016c020077017e01002a01',
    'Numbered record',
  );
  // Test Tuple and numbered record are exact the same
  test_(IDL.Tuple(IDL.Int8, IDL.Bool), [42, true], '4449444c016c020077017e01002a01', 'Tuple');
  test_(
    IDL.Tuple(IDL.Tuple(IDL.Int8, IDL.Bool), IDL.Record({ _0_: IDL.Int8, _1_: IDL.Bool })),
    [[42, true], { _0_: 42, _1_: true }],
    '4449444c026c020077017e6c020000010001012a012a01',
    'Tuple and Record',
  );
  test_(
    IDL.Record({ _2_: IDL.Int8, 2: IDL.Bool }),
    { _2_: 42, 2: true },
    '4449444c016c020277327e01002a01',
    'Mixed record',
  );
});

test('IDL encoding (bool)', () => {
  // Bool
  test_(IDL.Bool, true, '4449444c00017e01', 'true');
  test_(IDL.Bool, false, '4449444c00017e00', 'false');
  expect(() => IDL.encode([IDL.Bool], [0])).toThrow(/Invalid bool argument/);
  expect(() => IDL.encode([IDL.Bool], ['false'])).toThrow(/Invalid bool argument/);
});

test('IDL encoding (principal)', () => {
  // Principal
  test_(
    IDL.Principal,
    Principal.fromText('w7x7r-cok77-xa'),
    '4449444c0001680103caffee',
    'principal',
  );
  test_(
    IDL.Principal,
    Principal.fromText('2chl6-4hpzw-vqaaa-aaaaa-c'),
    '4449444c0001680109efcdab000000000001',
    'principal',
  );
  expect(() => IDL.encode([IDL.Principal], ['w7x7r-cok77-xa'])).toThrow(
    /Invalid principal argument/,
  );
  expect(() => IDL.decode([IDL.Principal], fromHexString('4449444c00016803caffee'))).toThrow(
    /Cannot decode principal/,
  );
});

test('IDL encoding (function)', () => {
  // Function
  test_(
    IDL.Func([IDL.Text], [IDL.Nat], []),
    [Principal.fromText('w7x7r-cok77-xa'), 'foo'],
    '4449444c016a0171017d000100010103caffee03666f6f',
    'function',
  );
  test_(
    IDL.Func([IDL.Text], [IDL.Nat], ['query']),
    [Principal.fromText('w7x7r-cok77-xa'), 'foo'],
    '4449444c016a0171017d01010100010103caffee03666f6f',
    'query function',
  );
  test_(
    IDL.Func([IDL.Text], [IDL.Nat], ['composite_query']),
    [Principal.fromText('w7x7r-cok77-xa'), 'foo'],
    '4449444c016a0171017d01030100010103caffee03666f6f',
    'composite_query function',
  );
});

test('IDL encoding (service)', () => {
  // Service
  test_(
    IDL.Service({ foo: IDL.Func([IDL.Text], [IDL.Nat], []) }),
    Principal.fromText('w7x7r-cok77-xa'),
    '4449444c026a0171017d00690103666f6f0001010103caffee',
    'service',
  );
  testDecode(
    IDL.Service({ foo: IDL.Func([IDL.Text], [IDL.Nat], []) }),
    Principal.fromText('w7x7r-cok77-xa'),
    // didc encode -t "(service { foo : (text) -> (nat) })" "(service \"w7x7r-cok77-xa\")"
    '4449444c02690103666f6f016a0171017d0001000103caffee',
    'service',
  );
  test_(
    IDL.Service({ foo: IDL.Func([IDL.Text], [IDL.Nat], ['query']) }),
    Principal.fromText('w7x7r-cok77-xa'),
    '4449444c026a0171017d0101690103666f6f0001010103caffee',
    'service',
  );
  test_(
    IDL.Service({ foo: IDL.Func([IDL.Text], [IDL.Nat], ['composite_query']) }),
    Principal.fromText('w7x7r-cok77-xa'),
    '4449444c026a0171017d0103690103666f6f0001010103caffee',
    'service',
  );
  test_(
    IDL.Service({
      foo: IDL.Func([IDL.Text], [IDL.Nat], []),
      foo2: IDL.Func([IDL.Text], [IDL.Nat], []),
    }),
    Principal.fromText('w7x7r-cok77-xa'),
    '4449444c026a0171017d00690203666f6f0004666f6f320001010103caffee',
    'service',
  );
});

test('IDL encoding (variants)', () => {
  // Variants
  const Result = IDL.Variant({ ok: IDL.Text, err: IDL.Text });
  test_(Result, { ok: 'good' }, '4449444c016b029cc20171e58eb4027101000004676f6f64', 'Result ok');
  test_(Result, { err: 'uhoh' }, '4449444c016b029cc20171e58eb402710100010475686f68', 'Result err');
  expect(() => IDL.encode([Result], [{}])).toThrow(/Invalid variant {ok:text; err:text} argument/);
  expect(() => IDL.encode([Result], [{ ok: 'ok', err: 'err' }])).toThrow(
    /Invalid variant {ok:text; err:text} argument/,
  );

  // Test that nullary constructors work as expected
  test_(
    IDL.Variant({ foo: IDL.Null }),
    { foo: null },
    '4449444c016b01868eb7027f010000',
    'Nullary constructor in variant',
  );

  // Test that Empty within variants works as expected
  test_(
    IDL.Variant({ ok: IDL.Text, err: IDL.Empty }),
    { ok: 'good' },
    '4449444c016b029cc20171e58eb4026f01000004676f6f64',
    'Empty within variants',
  );
  expect(() =>
    IDL.encode([IDL.Variant({ ok: IDL.Text, err: IDL.Empty })], [{ err: 'uhoh' }]),
  ).toThrow(/Invalid variant {ok:text; err:empty} argument:/);

  // Test for option
  test_(IDL.Opt(IDL.Nat), [], '4449444c016e7d010000', 'None option');
  test_(IDL.Opt(IDL.Nat), [BigInt(1)], '4449444c016e7d01000101', 'Some option');
  test_(IDL.Opt(IDL.Opt(IDL.Nat)), [[BigInt(1)]], '4449444c026e7d6e000101010101', 'Nested option');
  test_(IDL.Opt(IDL.Opt(IDL.Null)), [[null]], '4449444c026e7f6e0001010101', 'Null option');

  // Type description sharing
  test_(
    IDL.Tuple(IDL.Vec(IDL.Int), IDL.Vec(IDL.Nat), IDL.Vec(IDL.Int), IDL.Vec(IDL.Nat)),
    [[], [], [], []],
    '4449444c036d7c6d7d6c040000010102000301010200000000',
    'Type sharing',
  );
});

test('IDL encoding (rec)', () => {
  // Test for recursive types
  const List = IDL.Rec();
  expect(() => IDL.encode([List], [[]])).toThrow(/Recursive type uninitialized/);
  List.fill(IDL.Opt(IDL.Record({ head: IDL.Int, tail: List })));
  test_(List, [], '4449444c026e016c02a0d2aca8047c90eddae70400010000', 'Empty list');
  test_(
    List,
    [{ head: BigInt(1), tail: [{ head: BigInt(2), tail: [] }] }],
    '4449444c026e016c02a0d2aca8047c90eddae7040001000101010200',
    'List',
  );

  // Mutual recursion
  const List1 = IDL.Rec();
  const List2 = IDL.Rec();
  List1.fill(IDL.Opt(List2));
  List2.fill(IDL.Record({ head: IDL.Int, tail: List1 }));
  test_(List1, [], '4449444c026e016c02a0d2aca8047c90eddae70400010000', 'Empty list');
  test_(
    List1,
    [{ head: BigInt(1), tail: [{ head: BigInt(2), tail: [] }] }],
    '4449444c026e016c02a0d2aca8047c90eddae7040001000101010200',
    'List',
  );
});

test('IDL encoding (multiple arguments)', () => {
  const Result = IDL.Variant({ ok: IDL.Text, err: IDL.Text });

  // Test for multiple arguments
  test_args(
    [IDL.Nat, IDL.Opt(IDL.Text), Result],
    [BigInt(42), ['test'], { ok: 'good' }],
    '4449444c026e716b029cc20171e58eb40271037d00012a0104746573740004676f6f64',
    'Multiple arguments',
  );
  test_args([], [], '4449444c0000', 'empty args');
});

test('Stringify bigint', () => {
  expect(() => IDL.encode([IDL.Nat], [{ x: BigInt(42) }])).toThrow(/Invalid nat argument/);
});

test('decode / encode unknown variant', () => {
  const decodedType = IDL.Variant({ _24860_: IDL.Text, _5048165_: IDL.Text });
  const encoded = '4449444c016b029cc20171e58eb4027101000004676f6f64';

  const value = IDL.decode([IDL.Unknown], fromHexString(encoded))[0] as any;
  expect(value[hashedPropertyName('ok')]).toEqual('good');
  expect(value.type()).toEqual(decodedType);

  const reencoded = toHexString(IDL.encode([value.type()], [value]));
  expect(reencoded).toEqual(encoded);
});

test('throw on serializing unknown', () => {
  expect(() => IDL.encode([IDL.Unknown], ['test'])).toThrow('Unknown cannot be serialized');
});

test('decode unknown text', () => {
  const text = IDL.decode([IDL.Unknown], fromHexString('4449444c00017107486920e298830a'))[0] as any;
  expect(text.valueOf()).toEqual('Hi ☃\n');
  expect(text.type().name).toEqual(IDL.Text.name);
});

test('decode unknown int', () => {
  const int = IDL.decode([IDL.Unknown], fromHexString('4449444c00017c2a'))[0] as any;
  expect(int.valueOf()).toEqual(BigInt(42));
  expect(int.type().name).toEqual(IDL.Int.name);
});

test('decode unknown nat', () => {
  const nat = IDL.decode([IDL.Unknown], fromHexString('4449444c00017d2a'))[0] as any;
  expect(nat.valueOf()).toEqual(BigInt(42));
  expect(nat.type().name).toEqual(IDL.Nat.name);
});

test('decode unknown null', () => {
  const value = IDL.decode([IDL.Unknown], fromHexString('4449444c00017f'))[0] as any;
  // expect(value.valueOf()).toEqual(null); TODO: This does not hold. What do we do about this?
  expect(value.type().name).toEqual(IDL.Null.name);
});

test('decode unknown bool', () => {
  const value = IDL.decode([IDL.Unknown], fromHexString('4449444c00017e01'))[0] as any;
  expect(value.valueOf()).toEqual(true);
  expect(value.type().name).toEqual(IDL.Bool.name);
});

test('decode unknown fixed-width number', () => {
  const int8 = IDL.decode([IDL.Unknown], fromHexString('4449444c0001777f'))[0] as any;
  expect(int8.valueOf()).toEqual(127);
  expect(int8.type().name).toEqual(IDL.Int8.name);

  const int32 = IDL.decode([IDL.Unknown], fromHexString('4449444c000175d2029649'))[0] as any;
  expect(int32.valueOf()).toEqual(1234567890);
  expect(int32.type().name).toEqual(IDL.Int32.name);

  const int64 = IDL.decode(
    [IDL.Unknown],
    fromHexString('4449444c0001742a00000000000000'),
  )[0] as any;
  expect(int64.valueOf()).toEqual(BigInt(42));
  expect(int64.type().name).toEqual(IDL.Int64.name);

  const nat8 = IDL.decode([IDL.Unknown], fromHexString('4449444c00017b2a'))[0] as any;
  expect(nat8.valueOf()).toEqual(42);
  expect(nat8.type().name).toEqual(IDL.Nat8.name);

  const nat32 = IDL.decode([IDL.Unknown], fromHexString('4449444c0001792a000000'))[0] as any;
  expect(nat32.valueOf()).toEqual(42);
  expect(nat32.type().name).toEqual(IDL.Nat32.name);

  const nat64 = IDL.decode(
    [IDL.Unknown],
    fromHexString('4449444c000178d202964900000000'),
  )[0] as any;
  expect(nat64.valueOf()).toEqual(BigInt(1234567890));
  expect(nat64.type().name).toEqual(IDL.Nat64.name);
});

test('decode unknown float', () => {
  const float64 = IDL.decode(
    [IDL.Unknown],
    fromHexString('4449444c0001720000000000001840'),
  )[0] as any;
  expect(float64.valueOf()).toEqual(6);
  expect(float64.type().name).toEqual(IDL.Float64.name);

  const nan = IDL.decode([IDL.Unknown], fromHexString('4449444c000172000000000000f87f'))[0] as any;
  expect(nan.valueOf()).toEqual(Number.NaN);
  expect(nan.type().name).toEqual(IDL.Float64.name);

  const infinity = IDL.decode(
    [IDL.Unknown],
    fromHexString('4449444c000172000000000000f07f'),
  )[0] as any;
  expect(infinity.valueOf()).toEqual(Number.POSITIVE_INFINITY);
  expect(infinity.type().name).toEqual(IDL.Float64.name);
});

test('decode unknown vec of tuples', () => {
  const encoded = '4449444c026c02007c01716d000101012a0474657874';
  const value = IDL.decode([IDL.Unknown], fromHexString(encoded))[0] as any;
  expect(value).toEqual([[BigInt(42), 'text']]);
  const reencoded = toHexString(IDL.encode([value.type()], [value]));
  expect(reencoded).toEqual(encoded);
});

test('decode unknown service', () => {
  const value = IDL.decode(
    [IDL.Unknown],
    fromHexString('4449444c026a0171017d00690103666f6f0001010103caffee'),
  )[0] as any;
  expect(value).toEqual(Principal.fromText('w7x7r-cok77-xa'));
  expect(value.type()).toEqual(IDL.Service({ foo: IDL.Func([IDL.Text], [IDL.Nat], []) }));
});

test('decode unknown func', () => {
  const value = IDL.decode(
    [IDL.Unknown],
    fromHexString('4449444c016a0171017d01010100010103caffee03666f6f'),
  )[0] as any;
  expect(value).toEqual([Principal.fromText('w7x7r-cok77-xa'), 'foo']);
  expect(value.type()).toEqual(IDL.Func([IDL.Text], [IDL.Nat], ['query']));
});

test('decode / encode unknown mutual recursive lists', () => {
  // original types
  const List1 = IDL.Rec();
  const List2 = IDL.Rec();
  List1.fill(IDL.Opt(List2));
  List2.fill(IDL.Record({ head: IDL.Int, tail: List1 }));

  const encoded = '4449444c026e016c02a0d2aca8047c90eddae7040001000101010200';
  const value = IDL.decode([IDL.Unknown], fromHexString(encoded))[0] as any;
  expect(value).toEqual([
    { _1158359328_: BigInt(1), _1291237008_: [{ _1158359328_: BigInt(2), _1291237008_: [] }] },
  ]);

  const reencoded = toHexString(IDL.encode([value.type()], [value]));
  // expect(reencoded).toEqual(encoded); does not hold because type table is different
  // however the result is still compatible with original types:
  const value2 = IDL.decode([List1], fromHexString(reencoded))[0];
  expect(value2).toEqual([{ head: BigInt(1), tail: [{ head: BigInt(2), tail: [] }] }]);
});

test('decode / encode unknown nested record', () => {
  const nestedType = IDL.Record({ foo: IDL.Int32, bar: IDL.Bool });
  const recordType = IDL.Record({
    foo: IDL.Int32,
    bar: nestedType,
    baz: nestedType,
    bib: nestedType,
  });

  const recordUnknownType = IDL.Record({
    foo: IDL.Int32,
    bar: IDL.Unknown,
    baz: nestedType,
    bib: nestedType,
  });

  const nestedHashedType = IDL.Record({ _5097222_: IDL.Int32, _4895187_: IDL.Bool });
  const recordHashedType = IDL.Record({
    foo: IDL.Int32,
    bar: nestedHashedType,
    baz: nestedType,
    bib: nestedType,
  });

  const encoded =
    '4449444c026c02d3e3aa027e868eb702756c04d3e3aa0200dbe3aa0200bbf1aa0200868eb702750101012a000000012a000000012a0000002a000000';
  const nestedValue = { foo: 42, bar: true };
  const value = { foo: 42, bar: nestedValue, baz: nestedValue, bib: nestedValue };

  const decodedValue = IDL.decode([recordUnknownType], fromHexString(encoded))[0] as any;
  expect(decodedValue).toHaveProperty('bar');
  expect(decodedValue.bar[hashedPropertyName('foo')]).toEqual(42);
  expect(decodedValue.bar[hashedPropertyName('bar')]).toEqual(true);
  expect(decodedValue.baz).toEqual(value.baz);
  expect(decodedValue.bar.type()).toEqual(nestedHashedType);

  const reencoded = toHexString(IDL.encode([recordHashedType], [decodedValue]));
  // expect(reencoded).toEqual(encoded); does not hold because type table is different
  // however the result is still compatible with original types:
  const decodedValue2 = IDL.decode([recordType], fromHexString(reencoded))[0] as any;
  expect(decodedValue2).toEqual(value);
});

test('should correctly decode expected optional fields with lower hash than required fields', () => {
  const HttpResponse = IDL.Record({
    body: IDL.Text,
    headers: IDL.Vec(IDL.Tuple(IDL.Text, IDL.Text)),
    streaming_strategy: IDL.Opt(IDL.Text),
    status_code: IDL.Int,
    upgrade: IDL.Opt(IDL.Bool),
  });
  const encoded =
    '4449444c036c04a2f5ed880471c6a4a19806019ce9c69906029aa1b2f90c7c6d7f6e7e010003666f6f000101c801';
  const value = IDL.decode([HttpResponse], fromHexString(encoded))[0];
  expect(value).toEqual({
    body: 'foo',
    headers: [],
    status_code: BigInt(200),
    streaming_strategy: [],
    upgrade: [true],
  });
});

test('should decode matching optional fields if wire type contains additional fields', () => {
  const InputType = IDL.Record({
    a: IDL.Text,
    b: IDL.Opt(IDL.Text),
  });
  const OutputType = IDL.Record({
    b: IDL.Opt(IDL.Text),
  });

  const encoded = IDL.encode([InputType], [{ a: 'abc', b: ['123'] }]);
  const decoded = IDL.decode([OutputType], encoded)[0];

  expect(decoded).toEqual({
    b: ['123'],
  });
});

describe('IDL opt variant decoding', () => {
  it('should handle matching expected and wire type variants', () => {
    testDecode(
      IDL.Record({ a: IDL.Opt(IDL.Variant({ x: IDL.Null, y: IDL.Null, z: IDL.Null })) }),
      { a: [{ x: null }] },
      '4449444c036c0161016e026b03787f797f7a7f01000100', // Motoko: {a = ?#x} : {a : ?{#x;#y;#z}},
      'same variant under opt x',
    );
  });
  it('should handle matching expected and wire type variants', () => {
    testDecode(
      IDL.Record({ a: IDL.Opt(IDL.Variant({ x: IDL.Null, y: IDL.Null, z: IDL.Null })) }),
      { a: [{ z: null }] },
      '4449444c036c0161016e026b03787f797f7a7f01000102', // Motoko: {a = ?#z} : {a : ?{#x;#y;#z}}
      'same variant under opt z',
    );
  });
  it('should handle wider variant with expected tag', () => {
    testDecode(
      IDL.Record({ a: IDL.Opt(IDL.Variant({ x: IDL.Null, y: IDL.Null })) }),
      { a: [{ x: null }] },
      '4449444c036c0161016e026b03787f797f7a7f01000100', // Motoko: {a = ?#x} : {a : ?{#x;#y;#z}}
      'extended variant under opt expected tag',
    );
  });
  it('should handle wider variant with unexpected tag', () => {
    testDecode(
      IDL.Record({ a: IDL.Opt(IDL.Variant({ x: IDL.Null, y: IDL.Null })) }),
      { a: [] },
      '4449444c036c0161016e026b03787f797f7a7f01000102', // Motoko: {a = ?#z} : {a : ?{#x;#y;#z}}
      'extended variant under opt unexpected tag - defaulting',
    );
  });
});

describe('IDL opt edge cases', () => {
  it('should handle the option when the wire type is null type', () => {
    testDecode(
      IDL.Record({ a: IDL.Opt(IDL.Variant({ x: IDL.Null, y: IDL.Null })) }),
      { a: [] },
      '4449444c016c01617f0100',
      // Motoko: {a = null} : {a : null}
      'opt expected type null on wire',
    );
  });
  it('should handle the option when the wire type is reserved', () => {
    testDecode(
      IDL.Record({ a: IDL.Opt(IDL.Variant({ x: IDL.Null, y: IDL.Null })) }),
      { a: [] },
      '4449444c016c0161700100',
      // Motoko: {a = (): Any} : {a : Any}
      'opt expected type reserved on wire',
    );
  });
  it('should handle the option when the wire typ is non-optioned', () => {
    testDecode(
      IDL.Record({ a: IDL.Opt(IDL.Variant({ x: IDL.Null, y: IDL.Null })) }),
      { a: [{ x: null }] },
      `4449444c026c0161016b02787f797f010000`,
      // Motoko: {a = #x } : {a : {#x;#y}}
      'opt expected type non-opt on wire',
    );
  });
  it('should handle the option when the wire typ is an non-optioned wider variant with expected tag', () => {
    testDecode(
      IDL.Record({ a: IDL.Opt(IDL.Variant({ x: IDL.Null, y: IDL.Null })) }),
      { a: [{ x: null }] },
      `4449444c026c0161016b03787f797f7a7f010000`,
      // Motoko: {a = #x } : {a : {#x;#y;#z}}
      'opt expected, wire type non-opt, extended, with expected tag',
    );
  });
  it('should handle the option when the wire typ is an non-optioned wider variant with unexpected tag, defaulting', () => {
    testDecode(
      IDL.Record({ a: IDL.Opt(IDL.Variant({ x: IDL.Null, y: IDL.Null })) }),
      { a: [] },
      `4449444c026c0161016b03787f797f7a7f010002`,
      // Motoko: {a = #z} : {a : {#x;#y;#z}}
      'opt expected, wire type non-opt, extended, with unexpected tag, defaulting',
    );
  });
  it('should handle the option when the expected type is opt null, wire type is non-opt', () => {
    testDecode(
      IDL.Record({ a: IDL.Opt(IDL.Variant({ a: IDL.Opt(IDL.Null) })) }),
      { a: [] },
      `4449444c016c01617d010001`,
      // Motoko: {a = 1} : {a : Nat }
      'opt expected, wire type non-opt, other type - defaulting',
    );
  });
  it('should handle the option when the expected type is opt opt Nat, wire type is non-opt', () => {
    testDecode(
      IDL.Record({ a: IDL.Opt(IDL.Variant({ a: IDL.Opt(IDL.Opt(IDL.Nat)) })) }),
      { a: [] },
      `4449444c016c01617d010001`,
      // Motoko: {a = 1} : {a : Nat }
      'opt expected, wire type non-opt, other type - defaulting',
    );
  });
  it('should handle the option when the expected type is opt reserved, wire type is non-opt', () => {
    testDecode(
      IDL.Record({ a: IDL.Opt(IDL.Reserved) }),
      { a: [] },
      `4449444c016c01617d010001`,
      // Motoko: {a = 1} : {a : Nat }
      'opt expected, wire type non-opt, other type - defaulting',
    );
  });
});

/* The following suites are similar to the previous two but require more decoding of a Text value following the optional value.
   Tests decoding resumed correctly after any skip
*/

describe('IDL opt variant decoding (embedded)', () => {
  it('should handle matching expected and wire type variants', () => {
    testDecode(
      IDL.Record({
        a: IDL.Opt(IDL.Variant({ x: IDL.Null, y: IDL.Null, z: IDL.Null })),
        b: IDL.Text,
      }),
      { a: [{ x: null }], b: 'abc' },
      '4449444c036c02610162716e026b03787f797f7a7f0100010003616263', // Motoko: {a = ?#x; b = "abc"} : {a : ?{#x;#y;#z}; b :Text},
      'same variant under opt x',
    );
  });
  it('should handle matching expected and wire type variants', () => {
    testDecode(
      IDL.Record({
        a: IDL.Opt(IDL.Variant({ x: IDL.Null, y: IDL.Null, z: IDL.Null })),
        b: IDL.Text,
      }),
      { a: [{ z: null }], b: 'abc' },
      '4449444c036c02610162716e026b03787f797f7a7f0100010203616263', // Motoko: {a = ?#z; b = "abc"} : {a : ?{#x;#y;#z}; b : Text}
      'same variant under opt z',
    );
  });
  it('should handle wider variant with expected tag', () => {
    testDecode(
      IDL.Record({ a: IDL.Opt(IDL.Variant({ x: IDL.Null, y: IDL.Null })), b: IDL.Text }),
      { a: [{ x: null }], b: 'abc' },
      '4449444c036c02610162716e026b03787f797f7a7f0100010003616263', // Motoko: {a = ?#x; b = "abc"} : {a : ?{#x;#y;#z}; b : Text}
      'extended variant under opt expected tag',
    );
  });
  it('should handle wider variant with unexpected tag', () => {
    testDecode(
      IDL.Record({ a: IDL.Opt(IDL.Variant({ x: IDL.Null, y: IDL.Null })), b: IDL.Text }),
      { a: [], b: 'abc' },
      '4449444c036c02610162716e026b03787f797f7a7f0100010203616263', // Motoko: {a = ?#z; b = "abc"} : {a : ?{#x;#y;#z}; b : Text}
      'extended variant under opt unexpected tag - defaulting',
    );
  });
});

describe('IDL opt edge cases (embedded)', () => {
  it('should handle the option when the wire type is null type', () => {
    testDecode(
      IDL.Record({ a: IDL.Opt(IDL.Variant({ x: IDL.Null, y: IDL.Null })), b: IDL.Text }),
      { a: [], b: 'abc' },
      '4449444c016c02617f6271010003616263',
      // Motoko: {a = null; b = "abc"} : {a : null; b: Text}
      'opt expected type null on wire',
    );
  });
  it('should handle the option when the wire type is reserved', () => {
    testDecode(
      IDL.Record({ a: IDL.Opt(IDL.Variant({ x: IDL.Null, y: IDL.Null })), b: IDL.Text }),
      { a: [], b: 'abc' },
      '4449444c016c0261706271010003616263',
      // Motoko: {a = (): Any; b = "abc"} : {a : Any; b : Text}
      'opt expected type reserved on wire',
    );
  });
  it('should handle the option when the wire typ is non-optioned', () => {
    testDecode(
      IDL.Record({ a: IDL.Opt(IDL.Variant({ x: IDL.Null, y: IDL.Null })), b: IDL.Text }),
      { a: [{ x: null }], b: 'abc' },
      `4449444c026c02610162716b02787f797f01000003616263`,
      // Motoko: {a = #x; b = "abc" } : {a : {#x;#y}; b : Text}
      'opt expected type non-opt on wire',
    );
  });
  it('should handle the option when the wire typ is an non-optioned wider variant with expected tag', () => {
    testDecode(
      IDL.Record({ a: IDL.Opt(IDL.Variant({ x: IDL.Null, y: IDL.Null })), b: IDL.Text }),
      { a: [{ x: null }], b: 'abc' },
      `4449444c026c02610162716b03787f797f7a7f01000003616263`,
      // Motoko: {a = #x; b = "abc" } : {a : {#x;#y;#z}; b  : Text}
      'opt expected, wire type non-opt, extended, with expected tag',
    );
  });
  it('should handle the option when the wire typ is an non-optioned wider variant with unexpected tag, defaulting', () => {
    testDecode(
      IDL.Record({ a: IDL.Opt(IDL.Variant({ x: IDL.Null, y: IDL.Null })), b: IDL.Text }),
      { a: [], b: 'abc' },
      `4449444c026c02610162716b03787f797f7a7f01000203616263`,
      // Motoko: {a = #z; b = "abc"} : {a : Nat; b : Text}
      'opt expected, wire type non-opt, extended, with unexpected tag - defaulting',
    );
  });
  it('should handle the option when the expected type is opt null, wire type is non-opt', () => {
    testDecode(
      IDL.Record({ a: IDL.Opt(IDL.Variant({ a: IDL.Opt(IDL.Null) })), b: IDL.Text }),
      { a: [], b: 'abc' },
      `4449444c036c02610162716e026b03787f797f7a7f0100010203616263`,
      // Motoko: {a = 1; b = "abc"} : {a : Nat; b : Text }
      'opt expected, wire type non-opt, other type - defaulting',
    );
  });
  it('should handle the option when the expected type is opt opt Nat, wire type is non-opt', () => {
    testDecode(
      IDL.Record({ a: IDL.Opt(IDL.Variant({ a: IDL.Opt(IDL.Opt(IDL.Nat)) })), b: IDL.Text }),
      { a: [], b: 'abc' },
      `4449444c016c02617d627101000103616263`,
      // Motoko: {a = 1; b = "abc"} : {a : Nat; b : Text }
      'opt expected, wire type non-opt, other type - defaulting',
    );
  });
  it('should handle the option when the expected type is opt reserved, wire type is non-opt', () => {
    testDecode(
      IDL.Record({ a: IDL.Opt(IDL.Reserved), b: IDL.Text }),
      { a: [], b: 'abc' },
      `4449444c016c02617d627101000103616263`,
      // Motoko: {a = 1; b = "abc"} : {a : Nat; b : Text }
      'opt expected, wire type non-opt, other type - defaulting',
    );
  });
});

function testSub(t1: IDL.Type, t2: IDL.Type) {
  it(`${t1.display()} <: ${t2.display()}`, () => {
    IDL.resetSubtypeCache();
    expect(IDL.subtype(t1, t2)).toEqual(true);
  });
}

function testSubFail(t1: IDL.Type, t2: IDL.Type) {
  it(`not ${t1.display()} <: ${t2.display()}`, () => {
    IDL.resetSubtypeCache();
    expect(IDL.subtype(t1, t2)).toEqual(false);
  });
}

function testReflexive(t: IDL.Type) {
  testSub(t, t);
}

describe('IDL subtyping', () => {
  describe('Subtyping is reflexive', () => {
    testReflexive(IDL.Bool);
    testReflexive(IDL.Empty);
    testReflexive(IDL.Null);
    testReflexive(IDL.Principal);
    testReflexive(IDL.Reserved);
    testReflexive(IDL.Text);
    testReflexive(IDL.Unknown);

    testReflexive(IDL.Nat);
    testReflexive(IDL.Nat8);
    testReflexive(IDL.Nat16);
    testReflexive(IDL.Nat32);
    testReflexive(IDL.Nat64);

    testReflexive(IDL.Int);
    testReflexive(IDL.Int8);
    testReflexive(IDL.Int16);
    testReflexive(IDL.Int32);
    testReflexive(IDL.Int64);

    testReflexive(IDL.Float32);
    testReflexive(IDL.Float64);
  });

  describe('Subtyping on Vecs', () => {
    testReflexive(IDL.Vec(IDL.Nat));
    testSub(IDL.Vec(IDL.Nat), IDL.Vec(IDL.Int));
    testSubFail(IDL.Vec(IDL.Int), IDL.Vec(IDL.Nat));
  });

  describe('Subtyping on Options', () => {
    // Because of some of the more "special" rules around Option types
    // it turns out _any_ type is a subtype of _any_ optional type
    testReflexive(IDL.Opt(IDL.Nat));
    testSub(IDL.Opt(IDL.Nat), IDL.Opt(IDL.Int));
    testSub(IDL.Opt(IDL.Int), IDL.Opt(IDL.Nat));
    testSub(IDL.Nat, IDL.Opt(IDL.Int));
    testSub(IDL.Opt(IDL.Nat), IDL.Opt(IDL.Opt(IDL.Int)));
  });

  describe('Subtyping on Records', () => {
    testReflexive(IDL.Record({}));
    testReflexive(IDL.Record({ a: IDL.Nat }));

    // Subtyping on individual fields
    testSub(IDL.Record({ a: IDL.Nat }), IDL.Record({ a: IDL.Int }));
    testSubFail(IDL.Record({ a: IDL.Int }), IDL.Record({ a: IDL.Nat }));

    // Width subtyping
    testSub(IDL.Record({ a: IDL.Nat, b: IDL.Nat }), IDL.Record({ a: IDL.Nat }));
    testSubFail(IDL.Record({ a: IDL.Nat }), IDL.Record({ a: IDL.Nat, b: IDL.Nat }));

    // Opt, Null, or Reserved fields are allowed to be missing
    testSub(IDL.Record({ a: IDL.Nat }), IDL.Record({ a: IDL.Nat, b: IDL.Opt(IDL.Nat) }));
    testSub(IDL.Record({ a: IDL.Nat }), IDL.Record({ a: IDL.Nat, b: IDL.Null }));
    testSub(IDL.Record({ a: IDL.Nat }), IDL.Record({ a: IDL.Nat, b: IDL.Reserved }));
  });

  describe('Subtyping on Functions', () => {
    testReflexive(IDL.Func([], []));
    testReflexive(IDL.Func([IDL.Nat], [IDL.Int]));

    // Arg types are contravariant
    testSub(IDL.Func([IDL.Int], []), IDL.Func([IDL.Nat], []));
    testSub(IDL.Func([IDL.Int, IDL.Opt(IDL.Nat)], []), IDL.Func([IDL.Nat], []));
    testSubFail(IDL.Func([IDL.Nat, IDL.Nat], []), IDL.Func([IDL.Nat], []));

    // Return types are covariant
    testSub(IDL.Func([], [IDL.Nat]), IDL.Func([], [IDL.Int]));
    testSub(IDL.Func([], [IDL.Nat]), IDL.Func([], [IDL.Int, IDL.Opt(IDL.Nat)]));
    testSubFail(IDL.Func([], [IDL.Nat]), IDL.Func([], [IDL.Int, IDL.Int]));
  });

  describe('Subtyping on variants', () => {
    testReflexive(IDL.Variant({}));
    testReflexive(IDL.Variant({ a: IDL.Nat }));

    // Subtyping on individual alternatives happens pointwise
    testSub(IDL.Variant({ a: IDL.Nat }), IDL.Variant({ a: IDL.Int }));
    testSubFail(IDL.Variant({ a: IDL.Int }), IDL.Variant({ a: IDL.Nat }));

    // Width subtyping
    testSub(IDL.Variant({ a: IDL.Nat }), IDL.Variant({ a: IDL.Nat, b: IDL.Nat }));
    testSubFail(IDL.Variant({ a: IDL.Nat, b: IDL.Nat }), IDL.Variant({ a: IDL.Nat }));
  });

  describe('Subtyping on services', () => {
    testReflexive(IDL.Service({}));
    testReflexive(IDL.Service({ f: IDL.Func([], []) }));

    // Subtyping on service methods happens pointwise
    testSub(
      IDL.Service({ f: IDL.Func([IDL.Int], [IDL.Nat]) }),
      IDL.Service({ f: IDL.Func([IDL.Nat], [IDL.Int]) }),
    );
    testSubFail(
      IDL.Service({ f: IDL.Func([IDL.Nat], [IDL.Int]) }),
      IDL.Service({ f: IDL.Func([IDL.Int], [IDL.Nat]) }),
    );

    // Width subtyping
    testSub(
      IDL.Service({ f: IDL.Func([], []), g: IDL.Func([], []) }),
      IDL.Service({ f: IDL.Func([], []) }),
    );
    testSubFail(
      IDL.Service({ f: IDL.Func([], []) }),
      IDL.Service({ f: IDL.Func([], []), g: IDL.Func([], []) }),
    );
  });

  describe('Subtyping on recursive types', () => {
    const IntList = IDL.Rec();
    IntList.fill(IDL.Opt(IDL.Record({ head: IDL.Int, tail: IntList })));
    const NatList = IDL.Rec();
    NatList.fill(IDL.Opt(IDL.Record({ head: IDL.Nat, tail: NatList })));
    testSub(NatList, IntList);

    const Even = IDL.Rec();
    const Odd = IDL.Rec();
    Even.fill(IDL.Tuple(Odd));
    Odd.fill(IDL.Tuple(Even));

    testSub(IDL.Tuple(Even), Odd);
    testSub(IDL.Tuple(IDL.Tuple(Odd)), Odd);
  });

  describe('decoding function/service references', () => {
    const principal = Principal.fromText('w7x7r-cok77-xa');
    it('checks subtyping when decoding function references', () => {
      testDecode(
        IDL.Func([IDL.Int], [IDL.Nat]),
        [principal, 'myFunc'],
        // didc encode -t "(func (int) -> (nat))" "(func \"w7x7r-cok77-xa\" . \"myFunc\")"
        `4449444c016a017c017d000100010103caffee066d7946756e63`,
        'expects subtyping check to succeed',
      );

      testDecode(
        IDL.Opt(IDL.Func([IDL.Int], [IDL.Nat])),
        [],
        // didc encode -t "(opt func (nat) -> (nat))" "(opt func \"w7x7r-cok77-xa\" . \"myFunc\")"
        `4449444c026e016a017d017d00010001010103caffee066d7946756e63`,
        'expects failed subtype check under option to default to null',
      );

      testDecode(
        IDL.Record({
          optF: IDL.Opt(IDL.Func([IDL.Int], [IDL.Nat])),
        }),
        { optF: [] },
        // didc encode -t "(record { optF : func (nat) -> (nat) })" "(record { optF = func \"w7x7r-cok77-xa\" . \"myFunc\" })"
        `4449444c026c01b3a1d0cd04016a017d017d000100010103caffee066d7946756e63`,
        'expects failed subtype check under option to default to null',
      );

      testDecodeFail(
        IDL.Func([IDL.Int], [IDL.Nat]),
        // didc encode -t "(func (nat) -> (nat))" "(func \"w7x7r-cok77-xa\" . \"myFunc\")"
        `4449444c016a017d017d000100010103caffee066d7946756e63`,
        'expects subtyping check to fail',
      );
    });
    it('checks subtyping when decoding service references', () => {
      testDecode(
        IDL.Service({
          f: IDL.Func([IDL.Int], [IDL.Nat]),
        }),
        principal,
        // didc encode -t "(service { f : (int) -> (nat) })" "(service \"w7x7r-cok77-xa\")"
        `4449444c0269010166016a017c017d0001000103caffee`,
        'expects subtyping check to succeed',
      );

      testDecode(
        IDL.Opt(
          IDL.Service({
            f: IDL.Func([IDL.Int], [IDL.Nat]),
          }),
        ),
        [],
        // didc encode -t "(service { f : (nat) -> (nat) })" "(service \"w7x7r-cok77-xa\")"
        `4449444c0269010166016a017d017d0001000103caffee`,
        'expects subtyping check to fail',
      );

      testDecode(
        IDL.Opt(
          IDL.Service({
            f: IDL.Func([IDL.Int], [IDL.Nat]),
          }),
        ),
        [],
        // didc encode -t "(opt service { f : (nat) -> (nat) })" "(opt service \"w7x7r-cok77-xa\")"
        `4449444c036e0169010166026a017d017d000100010103caffee`,
        'expects subtyping check to fail',
      );

      testDecodeFail(
        IDL.Service({
          f: IDL.Func([IDL.Int], [IDL.Nat]),
        }),
        // didc encode -t "(service { f : (nat) -> (nat) })" "(service \"w7x7r-cok77-xa\")"
        `4449444c0269010166016a017d017d0001000103caffee`,
        'expects subtyping check to fail',
      );
    });
  });
});
