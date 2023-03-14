import { CborValue } from './cbor';
export declare abstract class AbstractExpiry {
  abstract toCBOR(): CborValue;
  abstract toHash(): ArrayBuffer;
}
