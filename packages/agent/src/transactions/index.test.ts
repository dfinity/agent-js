import { fromHex } from '../utils/buffer';
import { generateTransactionHash } from './index';
import { Transaction } from './model/transaction';

describe('generateTransactionHash', () => {
  it('should hash a `Burn` transaction to an expected transaction hash ', () => {
    const fromAddress = '386eff573a9157310d4661087b3c43f24fc7a0d088e9aa94d2e2f92a0d6ae617';
    const fromAddressBuffer = fromHex(fromAddress);
    const transaction: Transaction = {
      memo: BigInt('0'),
      operation: {
        Burn: {
          from: new Uint8Array(fromAddressBuffer),
          amount: {
            e8s: BigInt('100000000'),
          },
        },
      },
      created_at_time: { timestamp_nanos: BigInt('1677883406592845991') },
    };

    const txhash = generateTransactionHash(transaction);
    const expected = '6127b9971c71be6528a46aae8d3fa6e036dcb12bc80aa7b32ef0010e1dcec150';

    expect(txhash).toEqual(expected);
  });

  it('should hash a `Mint` transaction to an expected transaction hash ', () => {
    const toAddress = 'a1e89ab0c53ee226a1060a47aaa532de8b49c42a8a3a6b2f9243d25d8c694468';
    const toAddressBuffer = fromHex(toAddress);
    const transaction: Transaction = {
      memo: BigInt('1677889162'),
      operation: {
        Mint: {
          to: new Uint8Array(toAddressBuffer),
          amount: {
            e8s: BigInt('319927886'),
          },
        },
      },
      created_at_time: { timestamp_nanos: BigInt('1677889162355149987') },
    };
    const txhash = generateTransactionHash(transaction);
    const expected = 'cfe8c17b7bd11895218b1e7e2a6fc9bef9fa4c0f26dc67880800923bd9547dda';

    expect(txhash).toEqual(expected);
  });

  it('should hash a `Transfer` transaction to an expected transaction hash ', () => {
    const fromAddress = '2515048c83e50485c814bf952210b31fdc0069c448d07f3235ea6bcc895cdf22';
    const toAddress = 'eec99906e6c108c922b8f5355a2d9da80f1383c70747cd2bf0a01f630dddf4e0';

    const fromAddressBuffer = fromHex(fromAddress);
    const toAddressBuffer = fromHex(toAddress);

    const transaction: Transaction = {
      memo: BigInt('0'),
      operation: {
        Transfer: {
          from: new Uint8Array(fromAddressBuffer),
          to: new Uint8Array(toAddressBuffer),
          amount: {
            e8s: BigInt('1000000000'),
          },
          fee: {
            e8s: BigInt('10000'),
          },
        },
      },
      created_at_time: { timestamp_nanos: BigInt('1677889498538237513') },
    };
    const txhash = generateTransactionHash(transaction);
    const expected = '2ba934f402952b97f9a85fd465228157d3b73a9659da4bb201f71455f6b48f76';

    expect(txhash).toEqual(expected);
  });
});
