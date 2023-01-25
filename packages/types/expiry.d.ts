import { CborValue } from './cbor';

export abstract class AbstractExpiry {
  private readonly _value: bigint;

  public toCBOR(): CborValue;

  public toHash(): ArrayBuffer;
}
