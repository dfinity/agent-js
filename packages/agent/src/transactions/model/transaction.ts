import { BurnOperation } from './burnOperation';
import { MintOperation } from './mintOperation';
import { TimeStamp } from './timeStamp';
import { TransferOperation } from './transferOperation';

export type Operation =
  | { Burn: BurnOperation }
  | { Mint: MintOperation }
  | { Transfer: TransferOperation };
export interface Transaction {
  memo: bigint;
  operation: [] | [Operation];
  created_at_time: TimeStamp;
}
