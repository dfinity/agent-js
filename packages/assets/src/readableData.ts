import mime from 'mime/lite';
import fs from 'fs';
import path from 'path';

export type Data = File | Blob | Uint8Array | number[] | string;

export type ContentEncoding = 'identity' | 'gzip' | 'compress' | 'deflate' | 'br';

export interface DataConfig {
  fileName?: string;
  path?: string;
  contentType?: string;
  contentEncoding?: ContentEncoding;
  sha256?: Uint8Array;
}

export interface ReadableData {
  fileName: string;
  path: string;
  contentType: string;
  length: number;
  contentEncoding: ContentEncoding;
  sha256?: Uint8Array;
  open: () => Promise<void>;
  close: () => void;
  slice: (start: number, end: number) => Promise<Uint8Array>;
}

export class DefaultReadableDataImpl implements ReadableData {
  private fd?: number;

  protected constructor(
    private readonly data: Data,
    public readonly fileName: string,
    public readonly path: string,
    public readonly contentType: string,
    public readonly length: number,
    public readonly contentEncoding: ContentEncoding,
    public readonly sha256?: Uint8Array,
  ) {}

  /**
   * Default implementation of reading files in AssetManager that support various types of data
   * @param data Either a Blob, Uint8Array or number[]
   * @param config Configuration and overrides, file name is required
   */
  static async create(
    data: Exclude<Data, File | string>,
    config: Omit<DataConfig, 'fileName'> & Required<Pick<DataConfig, 'fileName'>>,
  ): Promise<ReadableData>;
  /**
   * Default implementation of reading files in AssetManager that support various types of data
   * @param data Either a File (web) or file path (Node)
   * @param config Optional configuration and overrides
   */
  static async create(data: File | string, config?: DataConfig): Promise<ReadableData>;
  static async create(data: Data, config?: DataConfig): Promise<ReadableData> {
    const fileName =
      config?.fileName ??
      (data instanceof File ? data.name : typeof data === 'string' ? path.basename(data) : '');
    const contentType =
      config?.contentType ??
      (data instanceof File ? data.type : mime.getType(fileName) ?? 'application/octet-stream');
    const length =
      data instanceof Blob
        ? data.size
        : data instanceof Uint8Array || Array.isArray(data)
        ? data.length
        : (await fs.promises.stat(data)).size;

    return new DefaultReadableDataImpl(
      data,
      fileName,
      config?.path ?? '',
      contentType,
      length,
      config?.contentEncoding ?? 'identity',
      config?.sha256,
    );
  }

  /**
   * Open ReadableData, should always be called before slices are read
   */
  public open() {
    return new Promise<void>(async (resolve, reject) => {
      if (typeof this.data === 'string') {
        if (typeof this.fd === 'number') {
          reject('File is already open');
          return;
        }
        fs.open(this.data, (err: any, fd: number) => {
          if (err) {
            reject(err);
            return;
          }
          this.fd = fd;
          resolve();
        });
        return;
      }
      resolve();
    });
  }

  /**
   * Close ReadableData, should always be called after all slices are read
   */
  public close() {
    return new Promise<void>(async (resolve, reject) => {
      if (typeof this.data === 'string') {
        if (typeof this.fd !== 'number') {
          reject('No open file handle found');
          return;
        }
        fs.close(this.fd, (err: any) => {
          if (err) {
            reject(err);
            return;
          }
          resolve();
        });
        return;
      }
      resolve();
    });
  }

  /**
   * Read slice of bytes from ReadableData
   * @param start Reading start offset
   * @param end Reading end offset
   */
  public slice(start: number, end: number): Promise<Uint8Array> {
    return new Promise(async (resolve, reject) => {
      if (end <= start) {
        reject('End offset should be larger than start offset');
        return;
      }

      // Read slice from File or Blob in browser
      if (this.data instanceof Blob) {
        resolve(new Uint8Array(await this.data.slice(start, end).arrayBuffer()));
        return;
      }

      // Read slice from file at path in Node
      if (typeof this.data === 'string') {
        if (typeof this.fd !== 'number') {
          reject('No open file handle found');
          return;
        }
        const buffer = Buffer.alloc(end - start);
        fs.read(this.fd, buffer, 0, end - start, start, (err: any) => {
          if (err) {
            reject(err);
            return;
          }
          resolve(new Uint8Array(buffer));
        });
        return;
      }

      // Read slice from Uint8Array in browser or Node
      if (this.data instanceof Uint8Array) {
        resolve(this.data.slice(start, end));
        return;
      }

      // Read slice from number[] in browser or Node
      if (Array.isArray(this.data)) {
        resolve(Uint8Array.from(this.data.slice(start, end)));
        return;
      }

      reject('Data slice could not be read');
    });
  }
}

/**
 * Check if value is ReadableData, used internally in AssetManager to
 * differentiate between data and custom ReadableData implementations.
 * @param value Either File, Blob, Uint8Array, number[], string or ReadableData
 */
export function isReadableData(value: Data | ReadableData): value is ReadableData {
  return (
    !!value &&
    !(value instanceof Blob) &&
    !(value instanceof Uint8Array) &&
    !Array.isArray(value) &&
    typeof value !== 'string'
  );
}
