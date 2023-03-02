import { BurnOperation } from './burnOperation';
import { MintOperation } from './mintOperation';
import { TimeStamp } from './timeStamp';
import { TransferOperation } from './transferOperation';

export interface Transaction {
  memo: bigint;
  operation: { Burn: BurnOperation } | { Mint: MintOperation } | { Transfer: TransferOperation };
  created_at_time: TimeStamp;
}
