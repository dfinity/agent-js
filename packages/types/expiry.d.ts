import { CborValue } from './cbor';

export abstract class AbstractExpiry {
  constructor(deltaInMSec: number);

  public toCBOR(): CborValue;

  public toHash(): ArrayBuffer;
}
