export const idlFactory = ({ IDL }) => {
  const Value = IDL.Rec();
  const Variant = IDL.Variant({
    Int: IDL.Int,
    Map: IDL.Vec(IDL.Tuple(IDL.Text, Value)),
    Nat: IDL.Nat,
    Nat64: IDL.Nat64,
    Blob: IDL.Vec(IDL.Nat8),
    Text: IDL.Text,
    Array: IDL.Vec(Value),
  });
  Value.fill(Variant);
  const CreateAppArgs = IDL.Record({
    metadata: IDL.Vec(IDL.Tuple(IDL.Text, Value)),
    name: IDL.Text,
    description: IDL.Text,
  });
  const ReleaseView = IDL.Record({
    features: IDL.Text,
    date: IDL.Nat64,
    name: IDL.Text,
    size: IDL.Nat64,
    version: IDL.Text,
    deprecated: IDL.Bool,
  });
  const AppView = IDL.Record({
    id: IDL.Text,
    updated_at: IDL.Nat64,
    metadata: IDL.Vec(IDL.Tuple(IDL.Text, Value)),
    name: IDL.Text,
    description: IDL.Text,
    created_at: IDL.Nat64,
    created_by: IDL.Text,
    latest_release: IDL.Opt(ReleaseView),
    install_count: IDL.Nat64,
  });
  const AppArgs = IDL.Record({
    optional: IDL.Opt(ReleaseView),
    metadata: IDL.Tuple(IDL.Text, IDL.Text),
    name: IDL.Text,
    description: IDL.Text,
  });
  // Define some basic types
  const BasicTypes = IDL.Record({
    IntVal: IDL.Int,
    NatVal: IDL.Nat,
    TextVal: IDL.Text,
    BoolVal: IDL.Bool,
    FloatVal: IDL.Float64,
    PrincipalVal: IDL.Principal,
  });

  // Define a variant type (similar to an enum)
  const Status = IDL.Variant({
    ok: IDL.Null,
    err: IDL.Text,
  });

  // Define a complex nested record
  const ComplexRecord = IDL.Record({
    basic: BasicTypes,
    nestedRecord: IDL.Record({
      field1: IDL.Nat,
      field2: IDL.Text,
    }),
    optionalField: IDL.Opt(IDL.Bool),
  });

  return IDL.Service({
    principal: IDL.Func([IDL.Principal], [IDL.Text], ['query']),
    number: IDL.Func([IDL.Nat8], [IDL.Text], ['query']),
    name: IDL.Func([IDL.Text], [IDL.Text], ['query']),
    opt_text: IDL.Func([IDL.Opt(IDL.Text)], [IDL.Text], ['query']),
    vec_nat8: IDL.Func([IDL.Vec(IDL.Nat8)], [IDL.Text], ['query']),
    opt_number: IDL.Func([IDL.Opt(IDL.Nat16)], [IDL.Text], ['query']),
    opt_vec: IDL.Func([IDL.Opt(IDL.Nat16), IDL.Vec(IDL.Text)], [IDL.Text], ['query']),
    vec_in_opt: IDL.Func([IDL.Opt(IDL.Vec(IDL.Text))], [IDL.Text], ['query']),
    number_vec: IDL.Func([IDL.Vec(IDL.Nat8)], [IDL.Text], ['query']),
    process_basic_types: IDL.Func([BasicTypes], [Status], ['query']),
    handle_complex_record: IDL.Func([ComplexRecord], [Status], ['query']),
    add_metadata: IDL.Func(
      [IDL.Record({ newField: IDL.Nat8, otherField: IDL.Text })],
      [IDL.Vec(IDL.Text)],
      [],
    ),
    add_opt_metadata: IDL.Func(
      [IDL.Opt(IDL.Record({ newField: IDL.Nat8, otherField: IDL.Text }))],
      [IDL.Vec(IDL.Text)],
      [],
    ),
    add_vec_metadata: IDL.Func(
      [IDL.Opt(IDL.Vec(IDL.Record({ newField: IDL.Nat8, otherField: IDL.Opt(IDL.Text) })))],
      [IDL.Vec(IDL.Text)],
      [],
    ),
    variant: IDL.Func(
      [
        IDL.Text,
        IDL.Opt(
          IDL.Variant({
            Int: IDL.Int,
            Int8: IDL.Int8,
            Int16: IDL.Int16,
            Int32: IDL.Int32,
            Int64: IDL.Int64,
            Text: IDL.Text,
            Nat: IDL.Nat,
            Nat8: IDL.Nat8,
            Nat16: IDL.Nat16,
            Nat32: IDL.Nat32,
            Nat64: IDL.Nat64,
          }),
        ),
      ],
      [IDL.Vec(IDL.Text)],
      [],
    ),
    tuple_text_nat8_int16: IDL.Func(
      [IDL.Tuple(IDL.Text, IDL.Nat8, IDL.Int16)],
      [IDL.Vec(IDL.Text)],
      [],
    ),
    receive: IDL.Func([ReleaseView], [IDL.Text], []),
    app: IDL.Func([AppArgs], [AppView], []),
    create_app: IDL.Func([CreateAppArgs], [AppView], []),
    recursive_value: IDL.Func([Value], [], []),
  });
};
export const init = () => {
  return [];
};
