import { toHex } from '../utils/buffer';
import { encode } from './encoder';
import { sha256 } from './hash';
import { mapBurnTransaction, mapMintTransaction, mapTransferTransaction } from './mapping';
import { BurnOperation } from './model/burnOperation';
import { MintOperation } from './model/mintOperation';
import { Transaction } from './model/transaction';
import { TransferOperation } from './model/transferOperation';

/**
 * Generate a sha256 of a transacation
 * @param transaction
 * @returns
 */
export function generateTransactionHash(transaction: Transaction): string | never {
  if (!transaction.operation) {
    throw new Error('No operation in transaction.');
  }

  const timestamp = transaction.created_at_time.timestamp_nanos;
  const memo = transaction.memo;

  if (Object.keys(transaction.operation).includes('Burn')) {
    const operation: BurnOperation = (transaction.operation as any)['Burn'] as BurnOperation;
    const from = toHex(operation.from);
    const amount = operation.amount.e8s;

    const transactionMap = mapBurnTransaction(from, amount, timestamp, memo);
    const encodedTransaction = encode(transactionMap);
    const transactionHash = sha256(encodedTransaction);

    return transactionHash;
  }

  if (Object.keys(transaction.operation).includes('Mint')) {
    const operation: MintOperation = (transaction.operation as any)['Mint'] as MintOperation;
    const to = toHex(operation.to);
    const amount = operation.amount.e8s;

    const transactionMap = mapMintTransaction(to, amount, timestamp, memo);
    const encodedTransaction = encode(transactionMap);
    const transactionHash = sha256(encodedTransaction);

    return transactionHash;
  }

  if (Object.keys(transaction.operation).includes('Transfer')) {
    const operation: TransferOperation = (transaction.operation as any)[
      'Transfer'
    ] as TransferOperation;
    const from = toHex(operation.from);
    const to = toHex(operation.to);
    const fee = operation.fee.e8s;
    const amount = operation.amount.e8s;

    const transactionMap = mapTransferTransaction(from, to, amount, fee, timestamp, memo);
    const encodedTransaction = encode(transactionMap);
    const transactionHash = sha256(encodedTransaction);

    return transactionHash;
  }

  throw new Error('Operation not recognised.');
}
