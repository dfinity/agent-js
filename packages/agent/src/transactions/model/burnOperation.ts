import { Tokens } from './tokens';

export interface BurnOperation {
  from: Uint8Array;
  amount: Tokens;
}
