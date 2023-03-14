import { CborValue } from './cbor';

export abstract class AbstractExpiry {
  public abstract toCBOR(): CborValue;

  public abstract toHash(): ArrayBuffer;
}
