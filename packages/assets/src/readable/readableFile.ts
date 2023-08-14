import { Readable } from './readable';
import mime from 'mime';

export class ReadableFile implements Readable {
  #file: File;

  constructor(file: File) {
    if (typeof file.type === 'undefined' || file.type === '') {
      const type = mime.getType(file.name) ?? 'UNKNOWN';
      this.#file = new File([file], file.name, { type });
    } else {
      this.#file = file;
    }
  }

  public get fileName(): string {
    return this.#file.name;
  }

  public get contentType(): string {
    return this.#file.type;
  }

  public get length(): number {
    return this.#file.size;
  }

  public async open(): Promise<void> {
    return Promise.resolve();
  }

  public async close(): Promise<void> {
    return Promise.resolve();
  }

  public async slice(start: number, end: number): Promise<Uint8Array> {
    return new Uint8Array(await this.#file.slice(start, end).arrayBuffer());
  }
}
