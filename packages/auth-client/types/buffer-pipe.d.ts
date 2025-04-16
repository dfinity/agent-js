declare module 'buffer-pipe' {
  import { Buffer } from 'buffer/';

  class BufferPipe {
    readonly buffer: Buffer;

    /**
     * Creates a new instance of a pipe
     * @param buf - an optional buffer to start with
     */
    constructor(buf?: Buffer);

    /**
     * Reads `num` number of bytes from the pipe
     * @param {number} num
     */
    read(num: number): Buffer;

    /**
     * Writes a buffer to the pipe
     * @param buf
     */
    write(buf: Buffer | number[]): void;

    /**
     * @returns {boolean} whether or not there is more data to read from the buffer
     */
    get end(): boolean;

    /**
     * @returns {number} the number of bytes read from the stream
     */
    get bytesRead(): number;

    /**
     * @returns {number} the number of bytes wrote to the stream
     */
    get bytesWrote(): number;
  }

  export = BufferPipe;
}
