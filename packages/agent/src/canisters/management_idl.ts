/**
 * This file is generated from public spec 0.10.
 * didc bind ic.did -t js
 */
/* tslint:disable */
// @ts-ignore
export default ({ IDL }) => {
  const canister_id = IDL.Principal;
  const wasm_module = IDL.Vec(IDL.Nat8);
  return IDL.Service({
    stop_canister: IDL.Func([IDL.Record({ canister_id: canister_id })], [], []),
    start_canister: IDL.Func([IDL.Record({ canister_id: canister_id })], [], []),
    canister_status: IDL.Func(
      [IDL.Record({ canister_id: canister_id })],
      [
        IDL.Record({
          status: IDL.Variant({
            stopped: IDL.Null,
            stopping: IDL.Null,
            running: IDL.Null,
          }),
        }),
      ],
      [],
    ),
    delete_canister: IDL.Func([IDL.Record({ canister_id: canister_id })], [], []),
    set_controller: IDL.Func(
      [
        IDL.Record({
          canister_id: canister_id,
          new_controller: IDL.Principal,
        }),
      ],
      [],
      [],
    ),
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
          memory_allocation: IDL.Opt(IDL.Nat),
          compute_allocation: IDL.Opt(IDL.Nat),
        }),
      ],
      [],
      [],
    ),
    raw_rand: IDL.Func([], [IDL.Vec(IDL.Nat8)], []),
    create_canister: IDL.Func([], [IDL.Record({ canister_id: canister_id })], []),
  });
};
