import { Tokens } from './tokens';

export interface TransferOperation {
  from: Uint8Array;
  to: Uint8Array;
  fee: Tokens;
  amount: Tokens;
}
