import { ActorSubclass } from '@dfinity/agent';
import { IDL } from '@dfinity/candid';
/**
 *
 * @param canister  ActorSubclass
 * @param name  string
 * @param idlFunc  IDL.FuncClass
 * @param profiler  any
 */
export declare function renderMethod(
  canister: ActorSubclass,
  name: string,
  idlFunc: IDL.FuncClass,
  root: ShadowRoot,
  profiler: any,
): void;
