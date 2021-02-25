import { Buffer } from 'buffer/';

export default class BufferPipe {
  private _bytesRead = 0;
  private _bytesWrote = 0;

  /**
   * @param buffer An optional buffer to start with.
   */
  constructor (public buffer: Buffer = Buffer.from([])) {}

  /**
   * @param num Number of bytes to read from the buffer.
   */
  public read(num: number): Buffer {
    this._bytesRead += num;
    const data = this.buffer.slice(0, num);
    this.buffer = this.buffer.slice(num);
    return data;
  }

  /**
   * @param buffer A buffer to write to the pipe.
   */
  public write(buffer: number[] | ArrayBuffer | Buffer | Uint8Array): void {
    const buf = Buffer.from(buffer as unknown[]);
    this._bytesWrote += buf.length;
    this.buffer = Buffer.concat([this.buffer, buf]);
  }

  /**
   * @returns Whether or not there is more data to read from the buffer
   */
  public get end(): boolean {
    return !this.buffer.length;
  }

  /**
   * @returns The number of bytes read from the stream
   */
  public get bytesRead(): number {
    return this._bytesRead;
  }

  /**
   * @returns The number of bytes wrote to the stream
   */
  public get bytesWrote(): number {
    return this._bytesWrote;
  }
}
