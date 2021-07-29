import { decode, encode } from './utils/base32';
import { getCrc32 } from './utils/getCrc';
import { sha224 } from './utils/sha224';

const SELF_AUTHENTICATING_SUFFIX = 2;
const ANONYMOUS_SUFFIX = 4;

const fromHexString = (hexString: string) =>
  new Uint8Array((hexString.match(/.{1,2}/g) ?? []).map(byte => parseInt(byte, 16)));

const toHexString = (bytes: Uint8Array) =>
  bytes.reduce((str, byte) => str + byte.toString(16).padStart(2, '0'), '');

export class Principal {
  public static anonymous(): Principal {
    return new this(new Uint8Array([ANONYMOUS_SUFFIX]));
  }

  public static selfAuthenticating(publicKey: Uint8Array): Principal {
    const sha = sha224(publicKey);
    return new this(new Uint8Array([...sha, SELF_AUTHENTICATING_SUFFIX]));
  }

  public static from(other: unknown): Principal {
    if (typeof other === 'string') {
      return Principal.fromText(other);
    } else if (
      typeof other === 'object' &&
      other !== null &&
      (other as Principal)._isPrincipal === true
    ) {
      return new Principal((other as Principal)._arr);
    }

    throw new Error(`Impossible to convert ${JSON.stringify(other)} to Principal.`);
  }

  public static fromHex(hex: string): Principal {
    return new this(fromHexString(hex));
  }

  public static fromText(text: string): Principal {
    const canisterIdNoDash = text.toLowerCase().replace(/-/g, '');

    let arr = decode(canisterIdNoDash);
    arr = arr.slice(4, arr.length);

    const principal = new this(arr);
    if (principal.toText() !== text) {
      throw new Error(`Principal "${principal.toText()}" does not have a valid checksum.`);
    }

    return principal;
  }

  public static fromUint8Array(arr: Uint8Array): Principal {
    return new this(arr);
  }

  public readonly _isPrincipal = true;

  protected constructor(private _arr: Uint8Array) {}

  public isAnonymous(): boolean {
    return this._arr.byteLength === 1 && this._arr[0] === ANONYMOUS_SUFFIX;
  }

  public toUint8Array(): Uint8Array {
    return this._arr;
  }

  public toHex(): string {
    return toHexString(this._arr).toUpperCase();
  }

  public toText(): string {
    const checksumArrayBuf = new ArrayBuffer(4);
    const view = new DataView(checksumArrayBuf);
    view.setUint32(0, getCrc32(this._arr));
    const checksum = new Uint8Array(checksumArrayBuf);

    const bytes = Uint8Array.from(this._arr);
    const array = new Uint8Array([...checksum, ...bytes]);

    const result = encode(array);
    const matches = result.match(/.{1,5}/g);
    if (!matches) {
      // This should only happen if there's no character, which is unreachable.
      throw new Error();
    }
    return matches.join('-');
  }

  public toString(): string {
    return this.toText();
  }
}
