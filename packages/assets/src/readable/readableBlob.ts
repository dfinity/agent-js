import { Readable } from './readable';
import mime from 'mime/lite';

export class ReadableBlob implements Readable {
  public readonly fileName: string;
  private readonly _blob: Blob;

  constructor(fileName: string, blob: Blob) {
    this.fileName = fileName;
    this._blob = blob;
  }

  public get contentType(): string {
    return this._blob.type || (mime.getType(this.fileName) ?? 'application/octet-stream');
  }

  public get length(): number {
    return this._blob.size;
  }

  async open(): Promise<void> {}

  async close(): Promise<void> {}

  async slice(start: number, end: number): Promise<Uint8Array> {
    return new Uint8Array(await this._blob.slice(start, end).arrayBuffer());
  }
}
