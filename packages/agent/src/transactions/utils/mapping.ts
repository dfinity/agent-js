// prettier-ignore
export const mapBurnTransaction = (
    from: string,
    amount: bigint,
    nanoTimestamp: bigint,
    memo: bigint,
  ): Map<number, any> =>
    new Map<number, any>()
      .set(0, new Map()
        .set(0, new Map()
        .set(0, from)
        .set(1, new Map()
          .set(0, amount))))
      .set(1, memo)
      .set(2, new Map()
        .set(0, nanoTimestamp));

// prettier-ignore
export const mapMintTransaction = (
    to: string, 
    amount: bigint, 
    nanoTimestamp: bigint, 
    memo: bigint
  ): Map<number, any> =>
    new Map<number, any>()
      .set(0, new Map()
        .set(1, new Map()
          .set(0, to)
          .set(1, new Map()
            .set(0, amount))))
      .set(1, memo)
      .set(2, new Map()
        .set(0, nanoTimestamp));

// prettier-ignore
export const mapTransferTransaction = (
    from: string,
    to: string,
    amount: bigint,
    fee: bigint,
    nanoTimestamp: bigint,
    memo: bigint,
  ): Map<number, any> =>
    new Map<number, any>()
      .set(0, new Map()
        .set(2,new Map()
          .set(0, from)
          .set(1, to)
          .set(2, new Map()
            .set(0, amount))
            .set(3, new Map()
              .set(0, fee))))
      .set(1, memo)
      .set(2, new Map()
        .set(0, nanoTimestamp));
