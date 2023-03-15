'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.ReadableFile = void 0;
class ReadableFile {
  constructor(file) {
    this._file = file;
  }
  get fileName() {
    return this._file.name;
  }
  get contentType() {
    return this._file.type;
  }
  get length() {
    return this._file.size;
  }
  async open() {
    return Promise.resolve();
  }
  async close() {
    return Promise.resolve();
  }
  async slice(start, end) {
    return new Uint8Array(await this._file.slice(start, end).arrayBuffer());
  }
}
exports.ReadableFile = ReadableFile;
//# sourceMappingURL=readableFile.js.map
