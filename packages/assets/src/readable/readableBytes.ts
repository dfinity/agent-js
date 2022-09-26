import { Readable } from './readable';
import mime from 'mime/lite';

export class ReadableBytes implements Readable {
  public readonly fileName: string;
  private readonly _bytes: Uint8Array | number[];

  constructor(fileName: string, bytes: Uint8Array | number[]) {
    this.fileName = fileName;
    this._bytes = bytes;
  }

  public get contentType(): string {
    return mime.getType(this.fileName) ?? 'application/octet-stream';
  }

  public get length(): number {
    return this._bytes.length;
  }

  public async open(): Promise<void> {}

  public async close(): Promise<void> {}

  public async slice(start: number, end: number): Promise<Uint8Array> {
    if (this._bytes instanceof Uint8Array) {
      return this._bytes.slice(start, end);
    }
    return Uint8Array.from(this._bytes.slice(start, end));
  }
}
