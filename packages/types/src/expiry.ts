import { CborValue } from './cbor.js';

export abstract class AbstractExpiry {
  public abstract toCBOR(): CborValue;

  public abstract toHash(): ArrayBuffer;
}
