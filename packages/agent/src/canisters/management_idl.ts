/**
 * This file is generated from the candid for asset management.
 */
/* tslint:disable */
// @ts-ignore
export default ({ IDL }) => {
  const canister_id = IDL.Principal;
  const definite_canister_settings = IDL.Record({
    controllers: IDL.Vec(IDL.Principal),
    freezing_threshold: IDL.Nat,
    memory_allocation: IDL.Nat,
    compute_allocation: IDL.Nat,
  });
  const canister_settings = IDL.Record({
    controllers: IDL.Opt(IDL.Vec(IDL.Principal)),
    freezing_threshold: IDL.Opt(IDL.Nat),
    memory_allocation: IDL.Opt(IDL.Nat),
    compute_allocation: IDL.Opt(IDL.Nat),
  });
  const wasm_module = IDL.Vec(IDL.Nat8);
  return IDL.Service({
    canister_status: IDL.Func(
      [IDL.Record({ canister_id: canister_id })],
      [
        IDL.Record({
          status: IDL.Variant({
            stopped: IDL.Null,
            stopping: IDL.Null,
            running: IDL.Null,
          }),
          memory_size: IDL.Nat,
          cycles: IDL.Nat,
          settings: definite_canister_settings,
          module_hash: IDL.Opt(IDL.Vec(IDL.Nat8)),
        }),
      ],
      [],
    ),
    create_canister: IDL.Func(
      [IDL.Record({ settings: IDL.Opt(canister_settings) })],
      [IDL.Record({ canister_id: canister_id })],
      [],
    ),
    delete_canister: IDL.Func([IDL.Record({ canister_id: canister_id })], [], []),
    deposit_cycles: IDL.Func([IDL.Record({ canister_id: canister_id })], [], []),
    install_code: IDL.Func(
      [
        IDL.Record({
          arg: IDL.Vec(IDL.Nat8),
          wasm_module: wasm_module,
          mode: IDL.Variant({
            reinstall: IDL.Null,
            upgrade: IDL.Null,
            install: IDL.Null,
          }),
          canister_id: canister_id,
        }),
      ],
      [],
      [],
    ),
    provisional_create_canister_with_cycles: IDL.Func(
      [
        IDL.Record({
          settings: IDL.Opt(canister_settings),
          amount: IDL.Opt(IDL.Nat),
        }),
      ],
      [IDL.Record({ canister_id: canister_id })],
      [],
    ),
    provisional_top_up_canister: IDL.Func(
      [IDL.Record({ canister_id: canister_id, amount: IDL.Nat })],
      [],
      [],
    ),
    raw_rand: IDL.Func([], [IDL.Vec(IDL.Nat8)], []),
    start_canister: IDL.Func([IDL.Record({ canister_id: canister_id })], [], []),
    stop_canister: IDL.Func([IDL.Record({ canister_id: canister_id })], [], []),
    uninstall_code: IDL.Func([IDL.Record({ canister_id: canister_id })], [], []),
    update_settings: IDL.Func(
      [
        IDL.Record({
          canister_id: IDL.Principal,
          settings: canister_settings,
        }),
      ],
      [],
      [],
    ),
  });
};
