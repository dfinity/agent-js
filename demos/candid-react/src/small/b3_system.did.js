export const idlFactory = ({ IDL }) => {
  const Value = IDL.Rec();
  Value.fill(
    IDL.Variant({
      Int: IDL.Int,
      Map: IDL.Vec(IDL.Tuple(IDL.Text, Value)),
      Nat: IDL.Nat,
      Nat64: IDL.Nat64,
      Blob: IDL.Vec(IDL.Nat8),
      Text: IDL.Text,
      Array: IDL.Vec(Value),
    }),
  );
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
    features: IDL.Func([IDL.Vec(IDL.Text)], [IDL.Vec(IDL.Text)], []),
    app: IDL.Func([AppArgs], [AppView], []),
    create_app: IDL.Func([CreateAppArgs], [AppView], []),
  });
};
export const init = () => {
  return [];
};
