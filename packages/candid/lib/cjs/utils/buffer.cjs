'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.PipeArrayBuffer = exports.fromHexString = exports.toHexString = exports.concat = void 0;
/**
 * Concatenate multiple array buffers.
 * @param buffers The buffers to concatenate.
 */
function concat(...buffers) {
  const result = new Uint8Array(buffers.reduce((acc, curr) => acc + curr.byteLength, 0));
  let index = 0;
  for (const b of buffers) {
    result.set(new Uint8Array(b), index);
    index += b.byteLength;
  }
  return result;
}
exports.concat = concat;
/**
 * Returns an hexadecimal representation of an array buffer.
 * @param bytes The array buffer.
 */
function toHexString(bytes) {
  return new Uint8Array(bytes).reduce((str, byte) => str + byte.toString(16).padStart(2, '0'), '');
}
exports.toHexString = toHexString;
/**
 * Return an array buffer from its hexadecimal representation.
 * @param hexString The hexadecimal string.
 */
function fromHexString(hexString) {
  var _a;
  return new Uint8Array(
    ((_a = hexString.match(/.{1,2}/g)) !== null && _a !== void 0 ? _a : []).map(byte =>
      parseInt(byte, 16),
    ),
  );
}
exports.fromHexString = fromHexString;
/**
 * A class that abstracts a pipe-like ArrayBuffer.
 */
class PipeArrayBuffer {
  /**
   * Creates a new instance of a pipe
   * @param buffer an optional buffer to start with
   * @param length an optional amount of bytes to use for the length.
   */
  constructor(
    buffer,
    length = (buffer === null || buffer === void 0 ? void 0 : buffer.byteLength) || 0,
  ) {
    this._buffer = buffer || new ArrayBuffer(0);
    this._view = new Uint8Array(this._buffer, 0, length);
  }
  get buffer() {
    // Return a copy of the buffer.
    return this._view.slice();
  }
  get byteLength() {
    return this._view.byteLength;
  }
  /**
   * Read `num` number of bytes from the front of the pipe.
   * @param num The number of bytes to read.
   */
  read(num) {
    const result = this._view.subarray(0, num);
    this._view = this._view.subarray(num);
    return result.slice().buffer;
  }
  readUint8() {
    const result = this._view[0];
    this._view = this._view.subarray(1);
    return result;
  }
  /**
   * Write a buffer to the end of the pipe.
   * @param buf The bytes to write.
   */
  write(buf) {
    const b = new Uint8Array(buf);
    const offset = this._view.byteLength;
    if (this._view.byteOffset + this._view.byteLength + b.byteLength >= this._buffer.byteLength) {
      // Alloc grow the view to include the new bytes.
      this.alloc(b.byteLength);
    } else {
      // Update the view to include the new bytes.
      this._view = new Uint8Array(
        this._buffer,
        this._view.byteOffset,
        this._view.byteLength + b.byteLength,
      );
    }
    this._view.set(b, offset);
  }
  /**
   * Whether or not there is more data to read from the buffer
   */
  get end() {
    return this._view.byteLength === 0;
  }
  /**
   * Allocate a fixed amount of memory in the buffer. This does not affect the view.
   * @param amount A number of bytes to add to the buffer.
   */
  alloc(amount) {
    // Add a little bit of exponential growth.
    // tslint:disable-next-line:no-bitwise
    const b = new ArrayBuffer(((this._buffer.byteLength + amount) * 1.2) | 0);
    const v = new Uint8Array(b, 0, this._view.byteLength + amount);
    v.set(this._view);
    this._buffer = b;
    this._view = v;
  }
}
exports.PipeArrayBuffer = PipeArrayBuffer;
//# sourceMappingURL=buffer.js.map
