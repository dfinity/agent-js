import type { ActorMethod } from '@dfinity/agent';

export interface _SERVICE {
  greet: ActorMethod<[string], string>;
  inc: ActorMethod<[], undefined>;
  inc_read: ActorMethod<[], bigint>;
  queryGreet: ActorMethod<[string], string>;
  read: ActorMethod<[], bigint>;
  write: ActorMethod<[bigint], undefined>;
}
