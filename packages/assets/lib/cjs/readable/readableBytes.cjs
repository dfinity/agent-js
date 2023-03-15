'use strict';
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, '__esModule', { value: true });
exports.ReadableBytes = void 0;
const lite_js_1 = __importDefault(require('mime/lite.js'));
class ReadableBytes {
  constructor(fileName, bytes) {
    this.fileName = fileName;
    this._bytes = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  }
  get contentType() {
    var _a;
    return (_a = lite_js_1.default.getType(this.fileName)) !== null && _a !== void 0
      ? _a
      : 'application/octet-stream';
  }
  get length() {
    return this._bytes.byteLength;
  }
  async open() {
    return Promise.resolve();
  }
  async close() {
    return Promise.resolve();
  }
  async slice(start, end) {
    return this._bytes.slice(start, end);
  }
}
exports.ReadableBytes = ReadableBytes;
//# sourceMappingURL=readableBytes.js.map
