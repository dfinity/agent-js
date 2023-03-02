import { Tokens } from './tokens';

export interface MintOperation {
  to: Uint8Array;
  amount: Tokens;
}
