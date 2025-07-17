import { type Readable } from './readable.ts';

export class ReadableFile implements Readable {
  private readonly _file: File;

  constructor(file: File) {
    this._file = file;
  }

  public get fileName(): string {
    return this._file.name;
  }

  public get contentType(): string {
    return this._file.type;
  }

  public get length(): number {
    return this._file.size;
  }

  public async open(): Promise<void> {
    return Promise.resolve();
  }

  public async close(): Promise<void> {
    return Promise.resolve();
  }

  public async slice(start: number, end: number): Promise<Uint8Array> {
    return new Uint8Array(await this._file.slice(start, end).arrayBuffer());
  }
}
