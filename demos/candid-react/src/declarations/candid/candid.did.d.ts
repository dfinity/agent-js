import type { ActorMethod } from '@dfinity/agent';
import type { Principal } from '@dfinity/principal';

export interface AppBug {
  logs: Array<string>;
  name: string;
  canister_id: Principal;
  description: string;
  version: string;
}
export type AppSystemError =
  | { InvalidSigner: null }
  | { UserAlreadyExists: null }
  | { WasmGetError: string }
  | { CreateCanisterError: string }
  | { UpdateCanisterControllersError: string }
  | { HelperError: HelperError }
  | { CanisterIdNotFound: null }
  | { InvalidWalletCanister: null }
  | { ValidateSignerError: string }
  | { AppIdMismatch: null }
  | { EncodeError: string }
  | { InstallArgError: string }
  | { AppAlreadyExists: null }
  | { OwnerMismatch: { owner: string; user: string } }
  | { ReleaseNameNotFound: null }
  | { InvalidAccountIdentifier: null }
  | { AppNotFound: null }
  | { WalletCanisterAlreadyInstalled: null }
  | { WalletCanisterRateError: string }
  | { WalletCanisterAlreadyExists: string }
  | { AppIsDeprecated: null }
  | { RateLimitExceeded: null }
  | { UpdateControllersError: string }
  | { WasmHashError: string }
  | { ReleaseNotFound: null }
  | { WasmNotFound: null }
  | { WasmInstallError: string }
  | { VersionError: string }
  | { NoCanisterAvailable: null }
  | { WalletCanisterDoesNotExist: string }
  | { InstallCodeError: string }
  | { WalletCanisterNotFound: null }
  | { CanisterStatusError: string }
  | { WasmAlreadyLoaded: null }
  | { InvalidReleaseName: string }
  | { ReleaseAlreadyExists: null };
export interface AppView {
  id: string;
  updated_at: bigint;
  metadata: Array<[string, Value]>;
  name: string;
  description: string;
  created_at: bigint;
  created_by: string;
  latest_release: [] | [ReleaseView];
  install_count: bigint;
}
export interface CanisterChange {
  timestamp_nanos: bigint;
  canister_version: bigint;
  origin: CanisterChangeOrigin;
  details: CanisterChangeDetails;
}
export type CanisterChangeDetails =
  | { creation: CreationRecord }
  | { code_deployment: CodeDeploymentRecord }
  | { controllers_change: CreationRecord }
  | { code_uninstall: null };
export type CanisterChangeOrigin =
  | { from_user: FromUserRecord }
  | { from_canister: FromCanisterRecord };
export interface CanisterInfoResponse {
  controllers: Array<Principal>;
  module_hash: [] | [Uint8Array | number[]];
  recent_changes: Array<CanisterChange>;
  total_num_changes: bigint;
}
export type CanisterInstallMode =
  | { reinstall: null }
  | { upgrade: null }
  | { install: null };
export interface CanisterStatusResponse {
  status: CanisterStatusType;
  memory_size: bigint;
  cycles: bigint;
  settings: DefiniteCanisterSettings;
  query_stats: QueryStats;
  idle_cycles_burned_per_day: bigint;
  module_hash: [] | [Uint8Array | number[]];
}
export type CanisterStatusType =
  | { stopped: null }
  | { stopping: null }
  | { running: null };
export interface CodeDeploymentRecord {
  mode: CanisterInstallMode;
  module_hash: Uint8Array | number[];
}
export interface CreateAppArgs {
  metadata: Array<[string, Value]>;
  name: string;
  description: string;
}
export interface CreateReleaseArgs {
  id: string;
  features: string;
  size: bigint;
  version: string;
  wasm_hash: Uint8Array | number[];
}
export interface CreationRecord {
  controllers: Array<Principal>;
}
export interface DefiniteCanisterSettings {
  freezing_threshold: bigint;
  controllers: Array<Principal>;
  memory_allocation: bigint;
  compute_allocation: bigint;
}
export interface FromCanisterRecord {
  canister_version: [] | [bigint];
  canister_id: Principal;
}
export interface FromUserRecord {
  user_id: Principal;
}
export type HelperError =
  | { CreateCanisterError: string }
  | { UpdateCanisterControllersError: string }
  | { ValidateSignerError: string }
  | { HexStringToVecError: string }
  | { InvalidHexString: null }
  | { InvalidSubaccount: string }
  | { EncodeError: string }
  | { InvalidAccountIdentifier: null }
  | { RateLimitExceeded: null }
  | { WasmHashError: string }
  | { HexStringToU64Error: string }
  | { HexStringToNatError: string }
  | { VersionError: string }
  | { SignerNotAvailable: null }
  | { HexStringToU128Error: string }
  | { InstallCodeError: string }
  | { CanisterStatusError: string }
  | { InvalidReleaseName: string };
export interface LoadRelease {
  total: bigint;
  chunks: bigint;
}
export interface QueryStats {
  response_payload_bytes_total: bigint;
  num_instructions_total: bigint;
  num_calls_total: bigint;
  request_payload_bytes_total: bigint;
}
export interface ReleaseView {
  features: string;
  date: bigint;
  name: string;
  size: bigint;
  version: string;
  deprecated: boolean;
}
export type Result = { Ok: UserView } | { Err: string };
export type Result_1 = { Ok: ReleaseView } | { Err: AppSystemError };
export interface SystemCanisterStatus {
  user_status: bigint;
  status_at: bigint;
  version: string;
  canister_status: CanisterStatusResponse;
}
export interface UserCanisterStatus {
  version: string;
  canister_status: CanisterStatusResponse;
}
export type UserStatus =
  | { Unregistered: null }
  | { SingleCanister: Principal }
  | { MultipleCanister: Array<Principal> }
  | { Registered: null };
export interface UserView {
  updated_at: bigint;
  metadata: Array<[string, Value]>;
  created_at: bigint;
  canisters: Array<Principal>;
}
export type Value =
  | { Int: bigint }
  | { Map: Array<[string, Value]> }
  | { Nat: bigint }
  | { Nat64: bigint }
  | { Blob: Uint8Array | number[] }
  | { Text: string }
  | { Array: Array<Value> };
export interface _SERVICE {
  add_release: ActorMethod<[string, CreateReleaseArgs], undefined>;
  add_user_app: ActorMethod<[Principal, string], undefined>;
  clear_bugs: ActorMethod<[Principal], undefined>;
  create_app: ActorMethod<[CreateAppArgs], AppView>;
  create_app_canister: ActorMethod<[string], Result>;
  deprecate_release: ActorMethod<[string, Uint8Array | number[]], ReleaseView>;
  get_app_version: ActorMethod<[Principal], string>;
  get_bugs: ActorMethod<[Principal], Array<AppBug>>;
  get_canister_info: ActorMethod<[Principal], CanisterInfoResponse>;
  get_canisters: ActorMethod<[], Array<Principal>>;
  get_create_canister_app_cycle: ActorMethod<[], bigint>;
  get_latest_release: ActorMethod<[string], Result_1>;
  get_release: ActorMethod<[Uint8Array | number[]], ReleaseView>;
  get_states: ActorMethod<[], UserView>;
  get_user_app_status: ActorMethod<[Principal], UserCanisterStatus>;
  get_user_ids: ActorMethod<[], Array<Uint8Array | number[]>>;
  get_user_states: ActorMethod<[], Array<UserView>>;
  get_user_status: ActorMethod<[], UserStatus>;
  install_app: ActorMethod<[Principal, string], Result>;
  load_wasm: ActorMethod<
    [Uint8Array | number[], Uint8Array | number[]],
    LoadRelease
  >;
  releases: ActorMethod<[string], Array<ReleaseView>>;
  remove_release: ActorMethod<[Uint8Array | number[]], undefined>;
  remove_user: ActorMethod<[Principal], undefined>;
  remove_user_app: ActorMethod<[Principal], undefined>;
  report_bug: ActorMethod<[AppBug], undefined>;
  status: ActorMethod<[], SystemCanisterStatus>;
  update_app: ActorMethod<[string, CreateAppArgs], AppView>;
  version: ActorMethod<[], string>;
}
