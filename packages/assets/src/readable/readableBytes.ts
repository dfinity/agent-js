import { type Readable } from './readable.ts';
import mime from 'mime/lite';

export class ReadableBytes implements Readable {
  public readonly fileName: string;
  private readonly _bytes: Uint8Array;

  constructor(fileName: string, bytes: Uint8Array | ArrayBuffer | number[]) {
    this.fileName = fileName;
    this._bytes = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  }

  public get contentType(): string {
    return mime.getType(this.fileName) ?? 'application/octet-stream';
  }

  public get length(): number {
    return this._bytes.byteLength;
  }

  public async open(): Promise<void> {
    return Promise.resolve();
  }

  public async close(): Promise<void> {
    return Promise.resolve();
  }

  public async slice(start: number, end: number): Promise<Uint8Array> {
    return this._bytes.slice(start, end);
  }
}
