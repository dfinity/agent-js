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
  return IDL.Service({
    // number: IDL.Func([IDL.Nat8], [IDL.Text], []),
    // name: IDL.Func([IDL.Text], [IDL.Text], []),
    // opt_text: IDL.Func([IDL.Opt(IDL.Text)], [IDL.Text], []),
    vec_nat8: IDL.Func([IDL.Vec(IDL.Nat8)], [IDL.Text], []),
    opt_number: IDL.Func([IDL.Opt(IDL.Nat16)], [IDL.Text], []),
    // opt_vec: IDL.Func([IDL.Opt(IDL.Nat16), IDL.Vec(IDL.Text)], [IDL.Text], []),
    // vec_in_opt: IDL.Func([IDL.Opt(IDL.Vec(IDL.Text))], [IDL.Text], []),
    // number_vec: IDL.Func([IDL.Vec(IDL.Nat8)], [IDL.Text], []),
    // add_metadata: IDL.Func(
    //   [IDL.Record({ newField: IDL.Nat8, otherField: IDL.Text })],
    //   [IDL.Vec(IDL.Text)],
    //   [],
    // ),
    // add_opt_metadata: IDL.Func(
    //   [IDL.Opt(IDL.Record({ newField: IDL.Nat8, otherField: IDL.Text }))],
    //   [IDL.Vec(IDL.Text)],
    //   [],
    // ),
    add_vec_metadata: IDL.Func(
      [IDL.Opt(IDL.Vec(IDL.Record({ newField: IDL.Nat8, otherField: IDL.Opt(IDL.Text) })))],
      [IDL.Vec(IDL.Text)],
      [],
    ),
    // add_value: IDL.Func([IDL.Variant({ Int: IDL.Int, Text: IDL.Text })], [IDL.Vec(IDL.Text)], []),
    // receive: IDL.Func([ReleaseView], [IDL.Text], []),
    // app: IDL.Func([AppArgs], [AppView], []),
    // create_app: IDL.Func([CreateAppArgs], [AppView], []),
  });
};
export const init = () => {
  return [];
};
