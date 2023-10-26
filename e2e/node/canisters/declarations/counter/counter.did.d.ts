import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';

export interface _SERVICE {
  greet: ActorMethod<[string], string>;
  inc: ActorMethod<[], undefined>;
  inc_read: ActorMethod<[], bigint>;
  queryGreet: ActorMethod<[string], string>;
  read: ActorMethod<[], bigint>;
  reset: ActorMethod<[], undefined>;
  write: ActorMethod<[bigint], undefined>;
}
