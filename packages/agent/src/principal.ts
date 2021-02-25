import { Buffer } from 'buffer/';
import { BinaryBlob, blobFromHex, blobFromUint8Array, blobToHex } from './types';
import { decode, encode } from './utils/base32';
import { getCrc32 } from './utils/getCrc';
import { sha224 } from './utils/sha224';

const SELF_AUTHENTICATING_SUFFIX = 2;
const ANONYMOUS_SUFFIX = 4;

export class Principal {
  public static anonymous(): Principal {
    return new this(blobFromUint8Array(new Uint8Array([ANONYMOUS_SUFFIX])));
  }

  public static selfAuthenticating(publicKey: BinaryBlob): Principal {
    const sha = sha224(publicKey);
    return new this(blobFromUint8Array(new Uint8Array([...sha, SELF_AUTHENTICATING_SUFFIX])));
  }

  public static fromHex(hex: string): Principal {
    return new this(blobFromHex(hex));
  }

  public static fromText(text: string): Principal {
    const canisterIdNoDash = text.toLowerCase().replace(/-/g, '');

    let arr = decode(canisterIdNoDash);
    arr = arr.slice(4, arr.length);

    return new this(blobFromUint8Array(arr));
  }

  public static fromBlob(blob: BinaryBlob): Principal {
    return new this(blob);
  }

  public readonly _isPrincipal = true;

  protected constructor(private _blob: BinaryBlob) {}

  public isAnonymous() {
    return this._blob.byteLength === 1 && this._blob[0] === ANONYMOUS_SUFFIX;
  }

  public toBlob(): BinaryBlob {
    return this._blob;
  }

  public toHash() {
    return this._blob;
  }

  public toHex(): string {
    return blobToHex(this._blob).toUpperCase();
  }

  public toText(): string {
    const checksumArrayBuf = new ArrayBuffer(4);
    const view = new DataView(checksumArrayBuf);
    view.setUint32(0, getCrc32(this.toHex().toLowerCase()), false);
    const checksum = Uint8Array.from(Buffer.from(checksumArrayBuf));

    const bytes = Uint8Array.from(this._blob);
    const array = new Uint8Array([...checksum, ...bytes]);

    const result = encode(array);
    const matches = result.match(/.{1,5}/g);
    if (!matches) {
      // This should only happen if there's no character, which is unreachable.
      throw new Error();
    }
    return matches.join('-');
  }

  public toString() {
    return this.toText();
  }
}
