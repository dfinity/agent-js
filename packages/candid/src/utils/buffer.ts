/**
 * Concatenate multiple array buffers.
 * @param buffers The buffers to concatenate.
 */
export function concat(...buffers: ArrayBuffer[]): ArrayBuffer {
  const result = new Uint8Array(buffers.reduce((acc, curr) => acc + curr.byteLength, 0));
  let index = 0;
  for (const b of buffers) {
    result.set(new Uint8Array(b), index);
    index += b.byteLength;
  }
  return result;
}

/**
 * Returns an hexadecimal representation of an array buffer.
 * @param bytes The array buffer.
 */
export function toHexString(bytes: ArrayBuffer): string {
  return new Uint8Array(bytes).reduce((str, byte) => str + byte.toString(16).padStart(2, '0'), '');
}

/**
 * Return an array buffer from its hexadecimal representation.
 * @param hexString The hexadecimal string.
 */
export function fromHexString(hexString: string): ArrayBuffer {
  return new Uint8Array((hexString.match(/.{1,2}/g) ?? []).map(byte => parseInt(byte, 16)));
}

/**
 * A class that abstracts a pipe-like ArrayBuffer.
 */
export class PipeArrayBuffer {
  private _view: Uint8Array;

  /**
   * Creates a new instance of a pipe
   * @param buffer an optional buffer to start with
   */
  constructor(buffer?: ArrayBuffer) {
    this._view = new Uint8Array(buffer || []);
  }

  get buffer(): ArrayBuffer {
    return this._view;
  }

  get byteLength(): number {
    return this._view.byteLength;
  }

  /**
   * Read `num` number of bytes from the front of the pipe.
   * @param num The number of bytes to read.
   */
  public read(num: number): ArrayBuffer {
    const result = this._view.slice(0, num).buffer;
    this._view = this._view.subarray(num);
    return result;
  }

  public readUint8(): number | undefined {
    const result = this._view[0];
    this._view = this._view.subarray(1);
    return result;
  }

  /**
   * Write a buffer to the end of the pipe.
   * @param buf The bytes to write.
   */
  public write(buf: ArrayBuffer): void {
    this._view = new Uint8Array([...this._view, ...new Uint8Array(buf)]);
  }

  /**
   * Whether or not there is more data to read from the buffer
   */
  get end(): boolean {
    return this._view.byteLength === 0;
  }

  /**
   * returns the number of bytes read from the stream
   */
  // get bytesRead(): number;

  /**
   * returns the number of bytes wrote to the stream
   */
  // get bytesWrote(): number;
}
